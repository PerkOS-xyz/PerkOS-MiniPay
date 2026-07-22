"use client";

import { useConnect } from "wagmi";
import { translated, useLanguage } from "../lib/i18n";

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
          ? translated(locale, "Connecting…", "Conectando…", "Conectando…")
          : translated(locale, "Connect wallet", "Conectar wallet", "Conectar carteira")}
      </button>
      <p className="max-w-xs text-xs text-[var(--muted)]">
        {translated(
          locale,
          "Testing in a browser? Connect a wallet (MetaMask/Rabby) and choose Celo, Base, or Robinhood Chain above.",
          "¿Probando en un navegador? Conecta una wallet (MetaMask/Rabby) y elige Celo, Base o Robinhood Chain arriba.",
          "Testando no navegador? Conecte uma carteira (MetaMask/Rabby) e escolha Celo, Base ou Robinhood Chain acima.",
        )}
      </p>
      {error && <p className="max-w-xs text-xs text-red-300">{error.message}</p>}
    </div>
  );
}
