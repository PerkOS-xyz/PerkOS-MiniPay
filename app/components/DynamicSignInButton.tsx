"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { translated, useLanguage } from "../lib/i18n";

/**
 * Browser-only "Continue with email or wallet" button that opens Dynamic's
 * auth flow. Once the user connects, DynamicWalletBridge publishes the wallet
 * to DynamicWalletContext → useWalletSession flips to connected and the normal
 * sign-in (sign nonce → Firebase) proceeds, signing via Dynamic natively.
 *
 * Render ONLY when `dynamicBrowserEnabled()` is true — `useDynamicContext`
 * throws if DynamicContextProvider isn't mounted.
 */
export function DynamicSignInButton() {
  const { locale } = useLanguage();
  const { setShowAuthFlow } = useDynamicContext();
  return (
    <div className="flex max-w-xs flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setShowAuthFlow(true)}
        className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-medium text-white"
      >
        {translated(locale, "Continue with email or wallet", "Continuar con email o wallet", "Continuar com e-mail ou carteira")}
      </button>
      <p className="text-xs leading-relaxed text-foreground/65">
        {translated(
          locale,
          "First connect. Then confirm one safe, gas-free signature to sign in.",
          "Primero conectas. Después confirmas una firma segura y sin gas para entrar.",
          "Primeiro conecte. Depois confirme uma assinatura segura e sem gás para entrar.",
        )}
      </p>
    </div>
  );
}
