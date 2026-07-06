"use client";

import { useState } from "react";

import { activateTemplate } from "../lib/perkosApi";
import { useVoiceInput } from "../lib/useVoiceInput";
import { Brand } from "./Brand";

// First-run entry: one question, four common money chores, and a speak-or-type
// box. Replaces the cold ~20-card gallery. Each chore maps to a starter team
// (template) that the shared fleet already covers; free-text/voice starts a
// general money team and carries the words in as the first goal.
const CHORES: { key: string; label: string; sub: string; glyph: string; templateId: string }[] = [
  { key: "track", label: "Track my money", sub: "Know what you earned and spent", glyph: "⬢", templateId: "merchant-daily" },
  { key: "invoice", label: "Get paid faster", sub: "Send invoices and chase payment", glyph: "✦", templateId: "freelance-invoice" },
  { key: "debts", label: "See who owes me", sub: "Track debts and customers", glyph: "◈", templateId: "market-trader" },
  { key: "remit", label: "Send money home", sub: "Track money you send family", glyph: "✧", templateId: "remit-family" },
];
const DEFAULT_TEMPLATE = "merchant-daily";

export function NeedToday({
  onStarted,
}: {
  onStarted: (projectId: string, goal?: string) => void;
}) {
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
      setError(e instanceof Error ? e.message : "Couldn't start. Please try again.");
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
      <header>
        <Brand />
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">What do you need done today?</h1>
        <p className="text-sm text-[var(--muted)]">
          Pick one, or just tell me. Your first jobs each month are free.
        </p>
      </div>

      {/* Speak or type — voice leads, it's more natural */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        <textarea
          value={shown}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. How much did I earn this week?"
          rows={2}
          className="resize-none bg-transparent text-sm text-[var(--foreground)] outline-none placeholder-[var(--muted)]"
        />
        <div className="flex items-center gap-2">
          {voice.supported && (
            <button
              type="button"
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              aria-label={voice.listening ? "Stop listening" : "Speak"}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                voice.listening
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-[var(--foreground)]"
              }`}
            >
              <span aria-hidden>{voice.listening ? "■" : "🎙"}</span>
              {voice.listening ? "Listening…" : "Speak"}
            </button>
          )}
          <button
            type="button"
            onClick={submitText}
            disabled={!text.trim() || Boolean(busy)}
            className="ml-auto rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === DEFAULT_TEMPLATE ? "Starting…" : "Go"}
          </button>
        </div>
        {voice.supported && (
          <p className="text-center text-[11px] text-[var(--muted)]">
            Speaking is easier than typing — tap Speak.
          </p>
        )}
      </div>

      {/* Common chores */}
      <div className="grid grid-cols-1 gap-2.5">
        {CHORES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => start(c.templateId)}
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
              <span className="block font-medium">{c.label}</span>
              <span className="block text-xs text-[var(--muted)]">{c.sub}</span>
            </span>
            <span className="shrink-0 text-lg text-[var(--muted)]" aria-hidden>
              {busy === c.templateId ? "…" : "›"}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </main>
  );
}
