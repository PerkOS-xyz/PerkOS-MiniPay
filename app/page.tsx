"use client";

import { useContext, useMemo, useState, type ReactNode } from "react";
import nextDynamic from "next/dynamic";
import { useConnect } from "wagmi";
import { useMiniPayHost } from "./lib/useIsMiniPay";
import { DynamicWalletContext } from "./lib/dynamicWallet";
import { LandingNavContext } from "./lib/landingNav";
import { useWalletSession, type WalletSessionStatus } from "./lib/useWalletSession";
import { Home } from "./components/Home";
import { Brand } from "./components/Brand";
import { ConnectButton } from "./components/ConnectButton";
import { MiniPayLanding } from "./components/landing/MiniPayLanding";

// Lazy — pulls @dynamic-labs only in the browser host (the chunk is shared
// with DynamicProviders, which is mounted under the same condition).
const DynamicSignInButton = nextDynamic(
  () => import("./components/DynamicSignInButton").then((m) => m.DynamicSignInButton),
  { ssr: false },
);

// Lazy for the same reason: the Dynamic-wired landing pulls @dynamic-labs.
const LandingWithDynamic = nextDynamic(
  () => import("./components/landing/LandingWithDynamic").then((m) => m.LandingWithDynamic),
  { ssr: false },
);

export default function Page() {
  const isMiniPayHost = useMiniPayHost();
  const { status, address, error, isConnected } = useWalletSession();
  const dyn = useContext(DynamicWalletContext);
  const { connect, connectors } = useConnect();
  // "Click the logo → go to the landing" — works from any state (signed-in,
  // inside MiniPay, or signed-out) by forcing the landing view here.
  const [forceLanding, setForceLanding] = useState(false);
  const nav = useMemo(
    () => ({ goToLanding: () => setForceLanding(true), goToApp: () => setForceLanding(false) }),
    [],
  );

  const wagmiGetStarted = () => {
    const c = connectors.find((x) => x.id === "injected") ?? connectors[0];
    if (c) connect({ connector: c });
  };
  // The landing, wired to the right connect. `onEnterApp` (when signed-in) turns
  // the CTA into "Open the app" and returns to the app instead of connecting.
  const renderLanding = (onEnterApp?: () => void) =>
    dyn ? (
      <LandingWithDynamic onEnterApp={onEnterApp} />
    ) : (
      <MiniPayLanding onGetStarted={wagmiGetStarted} onEnterApp={onEnterApp} />
    );

  let content: ReactNode;
  if (forceLanding) {
    // Reached via the logo. If a session exists, offer "Open the app" back.
    content = renderLanding(status === "signed-in" && address ? nav.goToApp : undefined);
  } else if (status === "signed-in" && address) {
    content = <Home address={address} />;
  } else if (isMiniPayHost === false && status === "signed-out" && !isConnected) {
    // Regular browser, signed-out → the marketing landing.
    content = renderLanding();
  } else {
    // MiniPay webview connecting / mid-connect / errors → minimal gate.
    content = (
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

  return <LandingNavContext.Provider value={nav}>{content}</LandingNavContext.Provider>;
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
