"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { signInWithWallet } from "./walletAuth";
import { DynamicWalletContext } from "./dynamicWallet";

export type WalletSessionStatus =
  | "loading"
  | "signed-out"
  | "syncing"
  | "signed-in"
  | "not-allowlisted"
  | "error";

// Module-level mutex, KEYED BY ADDRESS: the hook renders from several places,
// so concurrent effect runs for the SAME wallet join one in-flight sign-in —
// but an address switch mid-flight (Dynamic connects while wagmi was already
// connected, or an account change) mints a fresh sign-in instead of joining
// the stale one and reporting the wrong wallet as signed-in.
let pendingSignIn: { address: string; promise: Promise<unknown> } | null = null;

/**
 * Wallet session across the two hosts:
 *  - MiniPay webview: wagmi injected connector (implicit connect via AutoConnect).
 *  - Regular browser: Dynamic, via DynamicWalletContext (bridgeless — see
 *    dynamicWallet.ts). We prefer Dynamic ONLY while it actually has a
 *    connected wallet, so a stray Dynamic mount can never shadow wagmi.
 */
export function useWalletSession() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const dyn = useContext(DynamicWalletContext);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<WalletSessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  // Bumped when a completed sign-in doesn't match the current address (a
  // concurrent flow won the Firebase session) — re-runs the effect for the
  // wallet that is actually connected now.
  const [retry, setRetry] = useState(0);

  const useDynamic = Boolean(dyn?.isConnected && dyn.address);
  const address = useDynamic ? dyn!.address : wagmiAddress;
  const isConnected = useDynamic || wagmiConnected;

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      if (u) setStatus("signed-in");
      else setStatus("signed-out");
    });
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      // Wallet dropped (possibly mid-sign-in): reflect whatever Firebase says
      // instead of leaving a permanent "syncing".
      setStatus(firebaseAuth().currentUser ? "signed-in" : "signed-out");
      return;
    }
    const addr = address.toLowerCase();
    const fbUser = firebaseAuth().currentUser;
    if (fbUser && fbUser.uid.toLowerCase() === addr) {
      setStatus("signed-in");
      return;
    }

    let cancelled = false;
    setStatus("syncing");
    setError(null);

    // Sign with whichever side owns the wallet: Dynamic's native signer in a
    // browser tab, wagmi's injected connector inside MiniPay. Never mix — the
    // wagmi connector is a dead end while Dynamic holds the wallet.
    const signMessage = useDynamic
      ? dyn!.signMessage
      : (m: string) => signMessageAsync({ message: m });

    const entry =
      pendingSignIn?.address === addr
        ? pendingSignIn
        : (pendingSignIn = {
            address: addr,
            promise: signInWithWallet({ address: addr, signMessage }).finally(
              () => {
                if (pendingSignIn?.address === addr) pendingSignIn = null;
              },
            ),
          });

    entry.promise
      .then(() => {
        if (cancelled) return;
        // Only report signed-in when the Firebase session really belongs to
        // the CURRENT address; otherwise run again for this wallet.
        const uid = firebaseAuth().currentUser?.uid.toLowerCase();
        if (uid === addr) setStatus("signed-in");
        else setRetry((n) => n + 1);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Sign-in failed";
        setError(msg);
        setStatus(/allow|access/i.test(msg) ? "not-allowlisted" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, useDynamic, dyn, signMessageAsync, retry]);

  const logout = useCallback(async () => {
    // Dynamic owns the browser wallet — clearing only Firebase would bounce
    // the user straight back in via the still-connected primaryWallet. The
    // finally guarantees the Firebase session dies even if the wallet
    // logout throws.
    try {
      if (dyn?.isConnected) await dyn.logout();
    } finally {
      await signOut(firebaseAuth());
    }
  }, [dyn]);

  return {
    user,
    address: address?.toLowerCase(),
    isConnected,
    status,
    error,
    logout,
    isSignedIn: status === "signed-in",
  };
}
