"use client";

import { useEffect, useRef, useState } from "react";
import { addProjectMessage, mentionAgent } from "../lib/perkosApi";
import { useProjectMessages } from "../lib/useProjectMessages";

export function AgentChat({
  address,
  projectId,
  agentName,
  label,
  glyph = "✦",
  onBack,
}: {
  address: string;
  projectId: string;
  /** Machine name — routes the A2A mention. May be auto-suffixed (Assistant-2). */
  agentName: string;
  /** Display label for the header/placeholder. Defaults to the machine name. */
  label?: string;
  glyph?: string;
  onBack: () => void;
}) {
  const display = label ?? agentName;
  const messages = useProjectMessages(address, projectId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    try {
      await addProjectMessage(address, projectId, t, [`agent:${agentName}`]);
      await mentionAgent(projectId, agentName, t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setBusy(false);
    }
  }

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
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{display}</p>
          <p className="text-xs text-[var(--muted)]">Your agent</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-[var(--muted)]">
            Say hi to {display} or ask for help.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
              m.from === "user"
                ? "self-end bg-[var(--accent)] text-white"
                : "self-start bg-white/10"
            }`}
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-300">{error}</p>}

      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Message ${display}…`}
          className="flex-1 rounded-2xl bg-white/5 px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </main>
  );
}
