"use client";

import { useContext } from "react";
import nextDynamic from "next/dynamic";
import { useMiniPayHost } from "./lib/useIsMiniPay";
import { DynamicWalletContext } from "./lib/dynamicWallet";
import { useWalletSession, type WalletSessionStatus } from "./lib/useWalletSession";
import { Home } from "./components/Home";
import { Brand } from "./components/Brand";
import { ConnectButton } from "./components/ConnectButton";

// Lazy — pulls @dynamic-labs only in the browser host (the chunk is shared
// with DynamicProviders, which is mounted under the same condition).
const DynamicSignInButton = nextDynamic(
  () => import("./components/DynamicSignInButton").then((m) => m.DynamicSignInButton),
  { ssr: false },
);

export default function Page() {
  const isMiniPayHost = useMiniPayHost();
  const { status, address, error, isConnected } = useWalletSession();

  if (status === "signed-in" && address) {
    return <Home address={address} />;
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Brand className="mb-2 justify-center" />
      <h1 className="text-2xl font-semibold">Money &amp; customer tools</h1>
      <p className="text-sm text-[var(--muted)]">
        Simple helpers for your business, inside your wallet. Pay only for the work.
      </p>
      <GateAction
        status={status}
        isMiniPayHost={isMiniPayHost}
        isConnected={isConnected}
        error={error}
      />
    </main>
  );
}

function GateAction({
  status,
  isMiniPayHost,
  isConnected,
  error,
}: {
  status: WalletSessionStatus;
  isMiniPayHost: boolean | null;
  isConnected: boolean;
  error: string | null;
}) {
  const note = (text: string, danger = false) => (
    <p className={`mt-2 max-w-xs text-xs ${danger ? "text-red-300" : "text-[var(--muted)]"}`}>{text}</p>
  );

  if (status === "not-allowlisted") return note("This wallet isn't on the access list yet.");
  if (status === "error") return note(`Sign-in failed: ${error ?? "unknown error"}`, true);
  if (isConnected || status === "syncing") {
    return note(
      isMiniPayHost ? "Signing you in… approve the request in MiniPay." : "Signing you in…",
    );
  }
  if (isMiniPayHost) return note("Connecting your wallet…");
  if (isMiniPayHost === null) return note("Loading…");

  return <BrowserGate />;
}

/**
 * Regular-browser connect action. Gated on the CONTEXT, not on a second
 * host-detection pass: DynamicWalletContext is non-null exactly when
 * DynamicContextProvider is mounted (Providers made that call), so
 * DynamicSignInButton can never render without its provider — page.tsx and
 * providers.tsx each running their own useMiniPayHost poll could otherwise
 * disagree for a tick. Without the Dynamic env id (context null) we fall back
 * to the bare injected connector for local testing.
 */
function BrowserGate() {
  const dyn = useContext(DynamicWalletContext);
  return (
    <div className="mt-3">
      {dyn ? <DynamicSignInButton /> : <ConnectButton />}
    </div>
  );
}
