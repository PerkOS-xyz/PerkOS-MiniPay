"use client";

import { createContext, useContext } from "react";

import type { BrowserChainId } from "./browserChains";

export type BrowserChainContextValue = {
  chainId: BrowserChainId;
  switching: boolean;
  error: string | null;
  switchChain: (chainId: BrowserChainId) => Promise<void>;
};

export const BrowserChainContext = createContext<BrowserChainContextValue | null>(null);

export function useBrowserChain() {
  return useContext(BrowserChainContext);
}
