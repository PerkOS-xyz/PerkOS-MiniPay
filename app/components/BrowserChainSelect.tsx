"use client";

import { BROWSER_CHAIN_OPTIONS, type BrowserChainId } from "../lib/browserChains";
import { useBrowserChain } from "../lib/browserChainContext";
import { useLanguage } from "../lib/i18n";

export function BrowserChainSelect({ compact = false }: { compact?: boolean }) {
  const browserChain = useBrowserChain();
  const { locale } = useLanguage();
  if (!browserChain) return null;

  const label = locale === "es" ? "Red" : locale === "pt" ? "Rede" : "Network";

  return (
    <label className="relative shrink-0" title={browserChain.error ?? undefined}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={browserChain.chainId}
        disabled={browserChain.switching}
        onChange={(event) => void browserChain.switchChain(Number(event.target.value) as BrowserChainId)}
        className={`appearance-none rounded-xl border border-white/10 bg-white/5 pr-6 text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:opacity-60 ${
          compact ? "py-1 pl-2 text-xs" : "py-2 pl-3 text-sm"
        }`}
      >
        {BROWSER_CHAIN_OPTIONS.map((chain) => (
          <option key={chain.id} value={chain.id} className="bg-[var(--background)]">
            {compact ? chain.shortLabel : chain.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">
        ▾
      </span>
    </label>
  );
}
