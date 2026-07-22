"use client";

import { LOCALES, LOCALE_LABELS } from "../lib/landingMessages";
import { useLanguage } from "../lib/i18n";
import { BrowserChainSelect } from "./BrowserChainSelect";

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const label = locale === "es" ? "Idioma" : locale === "pt" ? "Idioma" : "Language";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <BrowserChainSelect compact={compact} />
      <label className="relative shrink-0">
        <span className="sr-only">{label}</span>
        <select
          aria-label={label}
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          className={`appearance-none rounded-xl border border-white/10 bg-white/5 pr-7 text-[var(--foreground)] outline-none focus:border-[var(--accent)] ${
            compact ? "py-1 pl-7 text-xs" : "px-3 py-2 text-sm"
          }`}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code} className="bg-[var(--background)]">
              {compact ? code.toUpperCase() : LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
        {compact ? (
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs" aria-hidden>
            ◉
          </span>
        ) : null}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">
          ▾
        </span>
      </label>
    </div>
  );
}
