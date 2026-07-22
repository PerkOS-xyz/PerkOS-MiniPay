"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

import {
  BROWSER_CHAIN_IDS,
  isBrowserChainId,
  type BrowserChainId,
} from "../lib/browserChains";
import { BrowserChainContext } from "../lib/browserChainContext";
const STORAGE_KEY = "anna_browser_chain";

export function BrowserChainProvider({ children }: { children: ReactNode }) {
  const { primaryWallet, network } = useDynamicContext();
  const [chainId, setChainId] = useState<BrowserChainId>(BROWSER_CHAIN_IDS.celo);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (isBrowserChainId(saved)) setChainId(saved);
    } catch {
      // Storage can be unavailable in privacy-restricted browser sessions.
    }
  }, []);

  useEffect(() => {
    const current = typeof network === "string" ? Number(network) : network;
    if (isBrowserChainId(current)) setChainId(current);
  }, [network]);

  const switchChain = useCallback(async (next: BrowserChainId) => {
    setError(null);
    setSwitching(true);
    try {
      if (primaryWallet) await primaryWallet.switchNetwork(next);
      setChainId(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // The selection still works for the current session.
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't switch network");
      throw cause;
    } finally {
      setSwitching(false);
    }
  }, [primaryWallet]);

  const value = useMemo(
    () => ({ chainId, switching, error, switchChain }),
    [chainId, switching, error, switchChain],
  );

  return <BrowserChainContext.Provider value={value}>{children}</BrowserChainContext.Provider>;
}
