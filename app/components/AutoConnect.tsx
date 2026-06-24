"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

/**
 * MiniPay connects implicitly (rule C1: no connect button). We poll for `window.ethereum`
 * (the iOS WKWebView injects it slightly late) and auto-connect ONLY when it's MiniPay.
 *
 * In a regular browser we do nothing here — the connect button (shown outside MiniPay) handles it,
 * so we don't pop an unexpected wallet prompt on page load.
 */
export function AutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (isConnected) return;
    let stopped = false;
    let connectCalled = false;
    let polls = 0;

    const tick = () => {
      if (stopped || isConnected || connectCalled) return;
      const eth =
        typeof window !== "undefined"
          ? (window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum
          : undefined;

      if (eth) {
        // Provider present. Auto-connect only inside MiniPay; browser uses the button.
        if (eth.isMiniPay) {
          const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];
          if (connector) {
            connectCalled = true;
            connect({ connector });
          }
        }
        return;
      }
      // provider not injected yet — keep polling (~9s max)
      if (polls++ < 30) setTimeout(tick, 300);
    };

    tick();
    return () => {
      stopped = true;
    };
  }, [isConnected, connect, connectors]);

  return null;
}
