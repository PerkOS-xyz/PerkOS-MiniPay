"use client";

import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import nextDynamic from "next/dynamic";
import { useConnect } from "wagmi";
import { useMiniPayHost } from "./lib/useIsMiniPay";
import { DynamicWalletContext } from "./lib/dynamicWallet";
import { LandingNavContext } from "./lib/landingNav";
import { useWalletSession, type WalletSessionStatus } from "./lib/useWalletSession";
import { Home } from "./components/Home";
import { Brand } from "./components/Brand";
import { ConnectButton } from "./components/ConnectButton";
import { AccessGate } from "./components/AccessGate";
import { MiniPayLanding } from "./components/landing/MiniPayLanding";
import { LanguageSelect } from "./components/LanguageSelect";
import { translated, useLanguage } from "./lib/i18n";

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
  const { locale } = useLanguage();
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
        <div className="absolute right-5 top-5"><LanguageSelect compact /></div>
        <Brand className="mb-2 justify-center" />
        <h1 className="text-2xl font-semibold">
          {translated(locale, "Everyday business help", "Ayuda para el trabajo diario", "Ajuda para o trabalho diário")}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {translated(
            locale,
            "Write better messages, reply to customers, and organize your day with Anna.",
            "Escribe mejores mensajes, responde a clientes y organiza tu día con Anna.",
            "Escreva mensagens melhores, responda a clientes e organize seu dia com Anna.",
          )}
        </p>
        <GateAction
          status={status}
          isMiniPayHost={isMiniPayHost}
          isConnected={isConnected}
          error={error}
          address={address}
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
  address,
}: {
  status: WalletSessionStatus;
  isMiniPayHost: boolean | null;
  isConnected: boolean;
  error: string | null;
  address?: string;
}) {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const note = (text: string, danger = false) => (
    <p className={`mt-2 max-w-xs text-xs ${danger ? "text-red-300" : "text-[var(--muted)]"}`}>{text}</p>
  );

  if (status === "not-allowlisted") {
    // Wallet connected but not on the allowlist → offer the access-code /
    // request-access form (needs the address to submit). Fall back to a plain
    // note if the address somehow isn't resolved yet.
    return address ? (
      <AccessGate address={address} />
    ) : (
      note(tr("This wallet isn't on the access list yet.", "Esta wallet todavía no está en la lista de acceso.", "Esta carteira ainda não está na lista de acesso."))
    );
  }
  if (status === "error") return note(`${tr("Sign-in failed", "El inicio de sesión falló", "Falha ao entrar")}: ${error ?? tr("unknown error", "error desconocido", "erro desconhecido")}`, true);
  if (isConnected || status === "syncing") {
    return (
      <div className="mt-3 w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
        <p className="text-sm font-medium">
          {tr("Wallet connected", "Wallet conectada", "Carteira conectada")}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)]/20 text-xs text-[var(--accent)]">2</span>
          <div>
            <p className="text-sm font-medium">{tr("Confirm it's you", "Confirma que eres tú", "Confirme que é você")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/65">
              {isMiniPayHost
                ? tr(
                    "Approve the gas-free signature in MiniPay. It does not move money.",
                    "Aprueba la firma sin gas en MiniPay. No mueve dinero.",
                    "Aprove a assinatura sem gás no MiniPay. Ela não movimenta dinheiro.",
                  )
                : tr(
                    "Approve the gas-free signature in your wallet to sign in. It does not move money.",
                    "Aprueba la firma sin gas en tu wallet para entrar. No mueve dinero.",
                    "Aprove a assinatura sem gás na sua carteira para entrar. Ela não movimenta dinheiro.",
                  )}
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (isMiniPayHost) {
    return <MiniPayConnectStatus />;
  }
  if (isMiniPayHost === null) return note(tr("Loading…", "Cargando…", "Carregando…"));

  return <BrowserGate />;
}

function MiniPayConnectStatus() {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlow(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mt-3 flex max-w-xs flex-col items-center gap-3">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]" aria-hidden />
      <p className="text-xs leading-relaxed text-foreground/65">
        {tr(
          "Connecting your MiniPay wallet automatically…",
          "Conectando automáticamente la wallet de MiniPay…",
          "Conectando automaticamente sua carteira MiniPay…",
        )}
      </p>
      {isSlow ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
        >
          {tr("Try again", "Reintentar", "Tentar novamente")}
        </button>
      ) : null}
    </div>
  );
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
