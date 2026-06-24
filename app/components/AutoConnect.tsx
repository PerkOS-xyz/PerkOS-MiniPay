"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

/**
 * MiniPay connects implicitly. As soon as the injected provider is present we auto-connect,
 * and the app NEVER renders a "Connect Wallet" button (MiniPay rule C1).
 *
 * The provider can be injected slightly after first paint (especially in the iOS WKWebView),
 * so we poll briefly for `window.ethereum` and call connect once it's there.
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
          ? (window as unknown as { ethereum?: unknown }).ethereum
          : undefined;
      const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];

      if (eth && connector) {
        connectCalled = true;
        connect({ connector });
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
