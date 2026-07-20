"use client";

import { useConnect } from "wagmi";
import { useLanguage } from "../lib/i18n";

/**
 * Browser-only connect button. MiniPay connects implicitly (no button), but in a regular browser
 * we let the tester connect an injected wallet (MetaMask/Rabby) set to Celo to exercise the flow.
 */
export function ConnectButton() {
  const { locale } = useLanguage();
  const { connect, connectors, status, error } = useConnect();
  const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => connector && connect({ connector })}
        disabled={status === "pending" || !connector}
        className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-medium text-white disabled:opacity-60"
      >
        {status === "pending"
          ? locale === "es" ? "Conectando…" : "Connecting…"
          : locale === "es" ? "Conectar wallet" : "Connect wallet"}
      </button>
      <p className="max-w-xs text-xs text-[var(--muted)]">
        {locale === "es"
          ? "¿Probando en un navegador? Conecta una wallet (MetaMask/Rabby) en Celo."
          : "Testing in a browser? Connect a wallet (MetaMask/Rabby) on Celo."}
      </p>
      {error && <p className="max-w-xs text-xs text-red-300">{error.message}</p>}
    </div>
  );
}
