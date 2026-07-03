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

// Module-level mutex: the hook renders from several places; only one sign-in flow at a time.
let pendingSignIn: Promise<unknown> | null = null;

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

  const useDynamic = Boolean(dyn?.isConnected && dyn.address);
  const address = useDynamic ? dyn!.address : wagmiAddress;
  const isConnected = useDynamic || wagmiConnected;

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      if (u) setStatus("signed-in");
      else setStatus(isConnected ? "syncing" : "signed-out");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fbUser = firebaseAuth().currentUser;
    if (!isConnected || !address) return;
    if (fbUser && fbUser.uid.toLowerCase() === address.toLowerCase()) {
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

    const run =
      pendingSignIn ??
      (pendingSignIn = signInWithWallet({
        address,
        signMessage,
      }).finally(() => {
        pendingSignIn = null;
      }));

    run
      .then(() => {
        if (!cancelled) setStatus("signed-in");
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
  }, [address, isConnected, useDynamic, dyn, signMessageAsync]);

  const logout = useCallback(async () => {
    // Dynamic owns the browser wallet — clearing only Firebase would bounce
    // the user straight back in via the still-connected primaryWallet.
    if (dyn?.isConnected) await dyn.logout();
    await signOut(firebaseAuth());
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
