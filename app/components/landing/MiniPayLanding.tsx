"use client";

import { useEffect, useRef, useState } from "react";

import { Brand } from "../Brand";
import {
  MESSAGES,
  type Locale,
} from "../../lib/landingMessages";
import { useLanguage } from "../../lib/i18n";
import { LanguageSelect } from "../LanguageSelect";
import { AnnaAvatar } from "../AnnaAvatar";

/**
 * PerkOS-MiniPay browser marketing landing (shown only in a regular browser,
 * signed-out). Mobile-first single column — the app body is capped at 28rem, so
 * this reads as a phone-width landing, which fits the audience (MiniPay users on
 * phones). Content is the product-reconciled spec: helper + verbs, non-custodial
 * trust, credits pricing, real templates. `onGetStarted` triggers the wallet
 * connect wired by the parent (Dynamic in browser).
 */
export function MiniPayLanding({
  onGetStarted,
  onEnterApp,
  busy = false,
}: {
  onGetStarted: () => void;
  /** When set (the viewer already has a session, e.g. reached the landing via
   *  the header logo while signed in), the primary CTA becomes "Open the app"
   *  and returns them to the app instead of starting a connect. */
  onEnterApp?: () => void;
  busy?: boolean;
}) {
  const { locale } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const heroCtaRef = useRef<HTMLDivElement | null>(null);

  // Sticky bottom CTA appears once the hero CTA scrolls out of view.
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: "0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const t = MESSAGES[locale];
  const visibleTemplates = showMore ? t.templates.items : t.templates.items.slice(0, 4);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // Signed-in viewers (reached the landing via the logo) get "Open the app";
  // everyone else gets the connect CTA with the section's own label.
  const PrimaryCta = ({ label }: { label: string }) => (
    <button
      onClick={onEnterApp ?? onGetStarted}
      disabled={busy}
      className="w-full rounded-2xl bg-[var(--accent)] px-5 py-3.5 font-medium text-white transition-opacity active:opacity-80 disabled:opacity-60"
    >
      {busy ? "…" : onEnterApp ? t.hero.enterApp : label}
    </button>
  );

  return (
    <main className="flex flex-col pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[var(--background)]/90 px-5 py-3 backdrop-blur">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={locale === "es" ? "Inicio de Anna" : "Anna home"}
          className="active:opacity-80"
        >
          <Brand />
        </button>
        <LanguageSelect compact />
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center gap-3 px-5 pb-10 pt-9 text-center">
        <AnnaAvatar size="hero" state="welcome" className="mb-1 shadow-[0_18px_60px_rgba(23,61,50,0.45)]" />
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--muted)]">
          {t.eyebrow}
        </span>
        <h1 className="max-w-[20ch] text-[27px] font-semibold leading-[1.15]">{t.hero.headline}</h1>
        <p className="max-w-[34ch] text-sm leading-relaxed text-foreground/75">{t.hero.subhead}</p>
        <div ref={heroCtaRef} className="mt-3 flex w-full flex-col gap-2">
          <PrimaryCta label={t.hero.ctaPrimary} />
          <button
            onClick={() => scrollTo("templates")}
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-[var(--muted)] active:bg-white/5"
          >
            {t.hero.ctaSecondary} ↓
          </button>
        </div>
        {!onEnterApp && (
          <p className="max-w-[36ch] text-xs leading-relaxed text-foreground/65">
            {t.hero.browserNote}
          </p>
        )}
        <div className="mt-1 flex flex-wrap justify-center gap-1.5 text-xs text-foreground/70">
          {t.hero.trust.map((x, i) => (
            <span key={i} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              ✓ {x}
            </span>
          ))}
        </div>
        <PreviewCard locale={locale} />
      </section>

      {/* Problem */}
      <section className="flex flex-col gap-3 px-5 py-8">
        <h2 className="text-sm font-medium text-[var(--muted)]">{t.problem.title}</h2>
        <ul className="flex flex-col divide-y divide-white/5">
          {t.problem.items.map((x, i) => (
            <li key={i} className="flex items-start gap-3 py-3 text-sm">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5">
                {["💸", "📒", "📊", "🕒"][i]}
              </span>
              <span className="text-foreground/90">{x}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-4 bg-white/[0.02] px-5 py-9">
        <h2 className="text-lg font-semibold">{t.how.title}</h2>
        <ol className="flex flex-col gap-4">
          {t.how.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 text-xs font-semibold text-[var(--accent)]">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-sm leading-relaxed text-foreground/70">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 text-center text-sm font-medium">
          {t.how.key}
        </p>
      </section>

      {/* Templates */}
      <section id="templates" className="flex flex-col gap-4 px-5 py-9">
        <div>
          <h2 className="text-lg font-semibold">{t.templates.title}</h2>
          <p className="text-sm text-[var(--muted)]">{t.templates.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3">
          {visibleTemplates.map((tpl) => (
            <div
              key={tpl.title}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)]/10 text-xl">
                {tpl.emoji}
              </span>
              <p className="text-sm font-semibold">{tpl.title}</p>
              <p className="text-sm leading-relaxed text-foreground/70">{tpl.benefit}</p>
            </div>
          ))}
        </div>
        {!showMore && (
          <button
            onClick={() => setShowMore(true)}
            className="self-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2 text-xs font-medium text-[var(--foreground)] active:bg-[var(--accent)]/20"
          >
            {t.templates.more}
          </button>
        )}
      </section>

      {/* Pricing */}
      <section className="flex flex-col gap-4 bg-white/[0.02] px-5 py-9 text-center">
        <h2 className="text-lg font-semibold">{t.pricing.title}</h2>
        <p className="mx-auto max-w-[38ch] text-sm leading-relaxed text-foreground/70">{t.pricing.body}</p>
        <div className="grid grid-cols-3 gap-2 text-left">
          {t.pricing.highlights.map((item) => (
            <div key={item.value} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-base font-semibold text-[var(--foreground)]">{item.value}</p>
              <p className="mt-1 text-[11px] leading-snug text-foreground/65">{item.label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-[38ch] text-xs leading-relaxed text-foreground/60">{t.pricing.smallprint}</p>
      </section>

      {/* Trust */}
      <section className="flex flex-col gap-3 px-5 py-9">
        <h2 className="text-sm font-medium text-[var(--muted)]">{t.trust.title}</h2>
        <div className="grid grid-cols-2 gap-2">
          {t.trust.items.map((x) => (
            <div
              key={x}
              className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs"
            >
              <span className="text-[#4ade80]">✓</span>
              <span>{x}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof + MiniPay how-to */}
      <section className="flex flex-col gap-4 px-5 py-8 text-center">
        <p className="text-sm text-[var(--muted)]">{t.social}</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
          <p className="text-sm font-medium">{t.minipay.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/70">{t.minipay.body}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-5 mb-8 flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-8 text-center">
        <h2 className="max-w-[22ch] text-xl font-semibold">{t.finalCta.title}</h2>
        <p className="text-sm text-[var(--muted)]">{t.finalCta.sub}</p>
        <div className="w-full">
          <PrimaryCta label={t.finalCta.cta} />
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-white/10 px-5 py-5 text-xs text-[var(--muted)]">
        <span>{t.footer.built}</span>
        <span>{t.footer.rights}</span>
      </footer>

      {/* Sticky mobile CTA */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[28rem] border-t border-white/10 bg-[var(--background)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <PrimaryCta label={t.hero.ctaPrimary} />
        </div>
      )}
    </main>
  );
}

/** A tiny HTML/CSS "inside MiniPay" preview — no image payload, no robot art. */
function PreviewCard({ locale }: { locale: Locale }) {
  const lines =
    locale === "es"
      ? ["Registré: 3 ventas hoy", "Ganancia de la semana: $84", "Recordatorio enviado a 2 clientes"]
      : ["Logged: 3 sales today", "This week's profit: $84", "Reminder sent to 2 customers"];
  return (
    <div className="mt-6 w-full rounded-3xl border border-white/10 bg-white/5 p-3">
      <div className="flex flex-col gap-2 rounded-2xl bg-[var(--background)] p-3 text-left">
        <div className="mb-1 flex items-center gap-2 border-b border-white/5 pb-2">
          <AnnaAvatar size="sm" state="recommending" decorative />
          <div>
            <p className="text-xs font-semibold">Anna</p>
            <p className="text-[10px] text-[var(--muted)]">
              {locale === "es" ? "Esto es lo que avanzamos hoy" : "Here is what we moved forward today"}
            </p>
          </div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground/90">{l}</span>
            {i === 0 && (
              <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] text-[var(--accent)]">
                {locale === "es" ? "1 crédito" : "1 credit"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
