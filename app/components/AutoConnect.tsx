"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

/**
 * MiniPay connects implicitly. As soon as the injected provider is present we auto-connect,
 * and the app NEVER renders a "Connect Wallet" button (MiniPay rule C1).
 *
 * Outside MiniPay (e.g. a desktop browser with an injected wallet) this still attempts a
 * connect; if there's no provider it quietly no-ops.
 */
export function AutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (isConnected) return;
    const hasProvider =
      typeof window !== "undefined" &&
      Boolean((window as unknown as { ethereum?: unknown }).ethereum);
    if (!hasProvider) return;

    const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (connector) connect({ connector });
  }, [isConnected, connect, connectors]);

  return null;
}
