"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { signInWithWallet } from "./walletAuth";

export type WalletSessionStatus =
  | "loading"
  | "signed-out"
  | "syncing"
  | "signed-in"
  | "not-allowlisted"
  | "error";

// Module-level mutex: the hook renders from several places; only one sign-in flow at a time.
let pendingSignIn: Promise<unknown> | null = null;

export function useWalletSession() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<WalletSessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);

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

    const run =
      pendingSignIn ??
      (pendingSignIn = signInWithWallet({
        address,
        signMessage: (m) => signMessageAsync({ message: m }),
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
  }, [address, isConnected, signMessageAsync]);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth());
  }, []);

  return {
    user,
    address: address?.toLowerCase(),
    status,
    error,
    logout,
    isSignedIn: status === "signed-in",
  };
}
