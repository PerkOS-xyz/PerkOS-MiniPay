"use client";

import { useMemo, useState } from "react";

import { runQuickAction, type QuickActionResult } from "../lib/perkosApi";
import { STARTER_ACTIONS, type QuickActionId } from "../lib/starterChores";
import { useLanguage } from "../lib/i18n";
import { useVoiceInput } from "../lib/useVoiceInput";

function newRequestId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `quick_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

type QuickActionRunner = (input: {
  action: QuickActionId;
  text: string;
  locale: "en" | "es" | "pt";
  requestId: string;
}) => Promise<QuickActionResult>;

export function QuickActions({
  compact = false,
  runner = runQuickAction,
}: {
  compact?: boolean;
  runner?: QuickActionRunner;
}) {
  const { locale } = useLanguage();
  const [selectedId, setSelectedId] = useState<QuickActionId | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const selected = useMemo(
    () => STARTER_ACTIONS.find((action) => action.id === selectedId) ?? null,
    [selectedId],
  );
  const voice = useVoiceInput({
    onResult: (words) => setText((previous) => (previous ? `${previous} ${words}` : words)),
  });

  const ui = locale === "es"
    ? {
        title: compact ? "¿Qué necesitas escribir?" : "¿Qué quieres hacer?",
        subtitle: compact
          ? "Elige una opción. No necesitas saber usar IA."
          : "Toca una opción, pega tu texto y Anna te entrega algo listo para copiar.",
        back: "Cambiar opción",
        run: "Crear respuesta",
        running: "Preparando…",
        price: "1 crédito máximo",
        copy: "Copiar",
        copied: "Copiado",
        copyFailed: "No pude copiarlo. Mantén presionado el texto para copiarlo.",
        again: "Otra versión",
        empty: "Escribe o pega un texto para continuar.",
        failed: "No pude preparar el texto. Inténtalo otra vez.",
        speak: "Hablar",
        stop: "Dejar de escuchar",
        listening: "Escuchando…",
        result: "Listo para usar",
      }
    : locale === "pt"
      ? {
          title: compact ? "O que você precisa escrever?" : "O que você quer fazer?",
          subtitle: compact
            ? "Escolha uma opção. Você não precisa saber usar IA."
            : "Toque em uma opção, cole seu texto e Anna entrega algo pronto para copiar.",
          back: "Mudar opção",
          run: "Criar resposta",
          running: "Preparando…",
          price: "no máximo 1 crédito",
          copy: "Copiar",
          copied: "Copiado",
          copyFailed: "Não consegui copiar. Pressione o texto para copiar.",
          again: "Outra versão",
          empty: "Escreva ou cole um texto para continuar.",
          failed: "Não consegui preparar o texto. Tente novamente.",
          speak: "Falar",
          stop: "Parar de ouvir",
          listening: "Ouvindo…",
          result: "Pronto para usar",
        }
      : {
          title: compact ? "What do you need to write?" : "What would you like to do?",
          subtitle: compact
            ? "Choose one. You don't need to know how to use AI."
            : "Choose an option, paste your text, and Anna gives you something ready to copy.",
          back: "Change option",
          run: "Create response",
          running: "Preparing…",
          price: "1 credit maximum",
          copy: "Copy",
          copied: "Copied",
          copyFailed: "I couldn't copy it. Press and hold the text to copy.",
          again: "Another version",
          empty: "Type or paste some text to continue.",
          failed: "I couldn't prepare the text. Please try again.",
          speak: "Speak",
          stop: "Stop listening",
          listening: "Listening…",
          result: "Ready to use",
        };

  function choose(actionId: QuickActionId) {
    setSelectedId(actionId);
    setText("");
    setResult("");
    setError(null);
    setCopied(false);
  }

  async function submit() {
    if (!selected) return;
    const input = text.trim();
    if (!input) {
      setError(ui.empty);
      return;
    }
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const response = await runner({
        action: selected.id,
        text: input,
        locale,
        requestId: newRequestId(),
      });
      setResult(response.result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : ui.failed);
    } finally {
      setBusy(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(ui.copyFailed);
    }
  }

  if (!selected) {
    return (
      <section className="flex flex-col gap-3" aria-labelledby={compact ? "quick-title-compact" : "quick-title"}>
        <div>
          <h2 id={compact ? "quick-title-compact" : "quick-title"} className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>
            {ui.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{ui.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {STARTER_ACTIONS.map((action) => {
            const copy = action.copy[locale];
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => choose(action.id)}
                className="flex min-h-[92px] flex-col items-start rounded-2xl border border-white/10 bg-white/5 p-3 text-left active:scale-[0.99]"
              >
                <span className="mb-2 grid h-8 min-w-8 place-items-center rounded-lg bg-[var(--accent)]/20 px-1.5 text-sm font-semibold text-[var(--accent)]" aria-hidden>
                  {action.glyph}
                </span>
                <span className="text-sm font-semibold leading-tight">{copy.label}</span>
                {!compact && <span className="mt-1 text-xs leading-snug text-[var(--muted)]">{copy.sub}</span>}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const copy = selected.copy[locale];
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4" aria-live="polite">
      <button
        type="button"
        onClick={() => setSelectedId(null)}
        className="w-fit text-xs font-medium text-[var(--accent)]"
      >
        ‹ {ui.back}
      </button>
      <div>
        <h2 className="text-xl font-semibold">{copy.label}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{copy.sub}</p>
      </div>
      <textarea
        value={voice.listening && voice.interim ? `${text}${text ? " " : ""}${voice.interim}` : text}
        onChange={(event) => setText(event.target.value)}
        placeholder={copy.placeholder}
        rows={compact ? 4 : 6}
        autoFocus
        className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-3 text-base leading-relaxed outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
      />
      <div className="flex items-center gap-2">
        {voice.supported && (
          <button
            type="button"
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            className={`rounded-full px-3 py-2 text-sm font-medium ${voice.listening ? "bg-red-500 text-white" : "bg-white/10"}`}
            aria-label={voice.listening ? ui.stop : ui.speak}
          >
            {voice.listening ? ui.listening : `🎙 ${ui.speak}`}
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--muted)]">{ui.price}</span>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy || !text.trim()}
        className="min-h-12 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? ui.running : result ? ui.again : ui.run}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {result && (
        <div className="rounded-2xl border border-[#4ade80]/30 bg-[#4ade80]/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4ade80]">{ui.result}</p>
          <p className="whitespace-pre-wrap text-base leading-relaxed">{result}</p>
          <button
            type="button"
            onClick={copyResult}
            className="mt-4 min-h-11 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold"
          >
            {copied ? `✓ ${ui.copied}` : ui.copy}
          </button>
        </div>
      )}
    </section>
  );
}
