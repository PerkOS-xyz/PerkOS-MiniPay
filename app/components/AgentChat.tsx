"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChatConversation } from "../lib/useChatConversation";
import { useLanguage } from "../lib/i18n";
import { LanguageSelect } from "./LanguageSelect";

export function AgentChat({
  projectId,
  agentName,
  label,
  glyph = "✦",
  onBack,
}: {
  /** kept for API symmetry; chat is scoped to the project conversation */
  address?: string;
  projectId: string;
  /** Machine name of the basic being chatted with (display + reply attribution). */
  agentName: string;
  /** Display label for the header/placeholder. */
  label?: string;
  glyph?: string;
  onBack: () => void;
}) {
  const { locale } = useLanguage();
  const display = label ?? agentName;
  // The project conversation the activation created (project-{id}); the user
  // + the template's basics are participants. Messages + agent replies stream
  // over PerkOS-Chat (WS) — the same path the main PerkOS App uses.
  const convId = useMemo(() => `project-${projectId}`, [projectId]);
  const { messages, status, send } = useChatConversation(convId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function onSend() {
    const t = text.trim();
    if (!t) return;
    setText("");
    send(t);
  }

  const connecting = status !== "connected";

  return (
    <main className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button onClick={onBack} aria-label="Back" className="-ml-1 px-1 text-2xl leading-none">
          ‹
        </button>
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-base"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
          aria-hidden
        >
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{display}</p>
          <p className="text-xs text-[var(--muted)]">
            {connecting
              ? locale === "es" ? "Conectando…" : "Connecting…"
              : locale === "es" ? "Especialista de Lina" : "Lina's specialist"}
          </p>
        </div>
        <LanguageSelect compact />
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-[var(--muted)]">
            {locale === "es" ? `Saluda a ${display} o pide ayuda.` : `Say hi to ${display} or ask for help.`}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.from.startsWith("user:");
          return (
            <div
              key={m.id}
              className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                mine ? "self-end bg-[var(--accent)] text-white" : "self-start bg-white/10"
              }`}
            >
              {m.text}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && onSend()}
          placeholder={locale === "es" ? `Mensaje para ${display}…` : `Message ${display}…`}
          className="flex-1 rounded-2xl bg-white/5 px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={onSend}
          disabled={!text.trim()}
          className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {locale === "es" ? "Enviar" : "Send"}
        </button>
      </div>
    </main>
  );
}
