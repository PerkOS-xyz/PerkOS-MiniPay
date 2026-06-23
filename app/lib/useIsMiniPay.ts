"use client";

import { useEffect, useState } from "react";

/**
 * MiniPay injects an EIP-1193 provider flagged with `isMiniPay`.
 * Unlike Farcaster's async `sdk.isInMiniApp()`, detection is synchronous off `window.ethereum`.
 */
export function detectMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum;
  return Boolean(eth?.isMiniPay);
}

/** React hook form. Returns false during SSR/first paint, then resolves on mount. */
export function useIsMiniPay(): boolean {
  const [isMiniPay, setIsMiniPay] = useState(false);
  useEffect(() => {
    setIsMiniPay(detectMiniPay());
  }, []);
  return isMiniPay;
}
