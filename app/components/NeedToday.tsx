"use client";

import { useState } from "react";

import { activateTemplate } from "../lib/perkosApi";
import { STARTER_CHORES } from "../lib/starterChores";
import { useVoiceInput } from "../lib/useVoiceInput";
import { Brand } from "./Brand";
import { LanguageSelect } from "./LanguageSelect";
import { useLanguage } from "../lib/i18n";

// First-run entry: one question, three common money chores, and a speak-or-type
// box. Replaces the cold ~20-card gallery. Each chore maps to a starter team
// (template) that the shared fleet already covers; free-text/voice starts a
// general money team and carries the words in as the first goal.
const DEFAULT_TEMPLATE = "merchant-daily";

export function NeedToday({
  onStarted,
}: {
  onStarted: (projectId: string, goal?: string) => void;
}) {
  const { locale } = useLanguage();
  const t = locale === "es"
    ? {
        title: "¿Qué necesitas resolver hoy?",
        subtitle: "Elige una opción o cuéntamelo. Tus primeros trabajos del mes son gratis.",
        placeholder: "Ejemplo: ¿Cuánto gané esta semana?",
        stop: "Dejar de escuchar",
        speak: "Hablar",
        listening: "Escuchando…",
        hint: "Hablar es más fácil que escribir. Toca Hablar.",
        go: "Continuar",
        starting: "Iniciando…",
        error: "No se pudo iniciar. Inténtalo nuevamente.",
      }
    : {
        title: "What do you need done today?",
        subtitle: "Pick one, or just tell me. Your first jobs each month are free.",
        placeholder: "e.g. How much did I earn this week?",
        stop: "Stop listening",
        speak: "Speak",
        listening: "Listening…",
        hint: "Speaking is easier than typing. Tap Speak.",
        go: "Go",
        starting: "Starting…",
        error: "Couldn't start. Please try again.",
      };
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voice = useVoiceInput({
    onResult: (t) => setText((prev) => (prev ? `${prev} ${t}` : t)),
  });

  async function start(templateId: string, goal?: string) {
    if (busy) return;
    setBusy(templateId);
    setError(null);
    try {
      const res = await activateTemplate(templateId);
      onStarted(res.activation.projectId, goal);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
      setBusy(null);
    }
  }

  const submitText = () => {
    const g = text.trim();
    if (g) start(DEFAULT_TEMPLATE, g);
  };

  const shown =
    voice.listening && voice.interim ? `${text ? `${text} ` : ""}${voice.interim}` : text;

  return (
    <main className="flex min-h-[100dvh] flex-col gap-5 px-5 py-7">
      <header className="flex items-center justify-between">
        <Brand />
        <LanguageSelect compact />
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="text-sm text-[var(--muted)]">{t.subtitle}</p>
      </div>

      {/* Speak or type — voice leads, it's more natural */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        <textarea
          value={shown}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          rows={2}
          className="resize-none bg-transparent text-sm text-[var(--foreground)] outline-none placeholder-[var(--muted)]"
        />
        <div className="flex items-center gap-2">
          {voice.supported && (
            <button
              type="button"
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              aria-label={voice.listening ? t.stop : t.speak}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                voice.listening
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-[var(--foreground)]"
              }`}
            >
              <span aria-hidden>{voice.listening ? "■" : "🎙"}</span>
              {voice.listening ? t.listening : t.speak}
            </button>
          )}
          <button
            type="button"
            onClick={submitText}
            disabled={!text.trim() || Boolean(busy)}
            className="ml-auto rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === DEFAULT_TEMPLATE ? t.starting : t.go}
          </button>
        </div>
        {voice.supported && (
          <p className="text-center text-[11px] text-[var(--muted)]">
            {t.hint}
          </p>
        )}
      </div>

      {/* Common chores */}
      <div className="grid grid-cols-1 gap-2.5">
        {STARTER_CHORES.map((c) => {
          const copy = c.copy[locale];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => start(c.templateId, copy.goal)}
              disabled={Boolean(busy)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)", color: "#fff" }}
                aria-hidden
              >
                {c.glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{copy.label}</span>
                <span className="block text-xs text-[var(--muted)]">{copy.sub}</span>
              </span>
              <span className="shrink-0 text-lg text-[var(--muted)]" aria-hidden>
                {busy === c.templateId ? "…" : "›"}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </main>
  );
}
