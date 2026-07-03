"use client";

import nextDynamic from "next/dynamic";
import { useMiniPayHost } from "./lib/useIsMiniPay";
import { dynamicBrowserEnabled } from "./lib/dynamicBrowser";
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
      <h1 className="text-2xl font-semibold">Your AI team</h1>
      <p className="text-sm text-[var(--muted)]">
        A coworking of agents for your small business — on Celo, in MiniPay.
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

  // Regular browser. With the shared PerkOS Dynamic environment configured we
  // open Dynamic's connect modal (email or wallet); without it, fall back to
  // the bare injected connector for local testing.
  if (dynamicBrowserEnabled(isMiniPayHost)) {
    return (
      <div className="mt-3">
        <DynamicSignInButton />
      </div>
    );
  }
  return (
    <div className="mt-3">
      <ConnectButton />
    </div>
  );
}
