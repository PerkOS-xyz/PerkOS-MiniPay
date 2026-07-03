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

/**
 * Three-state host resolution for the provider switch: `null` while resolving,
 * then true (MiniPay webview) / false (regular browser). Unlike useIsMiniPay
 * (which flips false→true), this never mounts Dynamic prematurely: we poll
 * briefly because MiniPay's WKWebView injects `window.ethereum` slightly late.
 * If a provider shows up without `isMiniPay`, or ~1.2s pass with none at all,
 * we resolve "browser". Worst case (an unusually slow MiniPay injection) the
 * Dynamic tree mounts but never connects, and useWalletSession still reaches
 * the wallet through the wagmi fallback — degraded, not broken.
 */
export function useMiniPayHost(): boolean | null {
  const [host, setHost] = useState<boolean | null>(null);
  useEffect(() => {
    let stopped = false;
    let polls = 0;
    const tick = () => {
      if (stopped) return;
      const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum;
      if (eth?.isMiniPay) return setHost(true);
      if (eth || polls >= 4) return setHost(false);
      polls++;
      setTimeout(tick, 300);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, []);
  return host;
}
