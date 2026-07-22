"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { detectLocale, type Locale } from "./landingMessages";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const DOCUMENT_TITLES: Record<Locale, string> = {
  en: "Anna by PerkOS — Your business companion",
  es: "Anna by PerkOS — Tu compañera de negocio",
  pt: "Anna by PerkOS — Sua parceira de negócios",
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      window.localStorage.setItem("perkos_lang", next);
    } catch {
      // Storage can be unavailable in privacy-restricted webviews.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = DOCUMENT_TITLES[locale];
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

export function translated(locale: Locale, en: string, es: string, pt: string): string {
  return locale === "es" ? es : locale === "pt" ? pt : en;
}
