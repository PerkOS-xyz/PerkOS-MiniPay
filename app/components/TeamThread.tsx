"use client";

import { useEffect, useRef, useState } from "react";

import {
  approveWorkflow,
  getWorkflow,
  proposeWorkflow,
  type WorkflowTask,
} from "../lib/perkosApi";
import { useVoiceInput } from "../lib/useVoiceInput";

/**
 * The "one door": a single conversational thread with the team, with a
 * speak-or-type composer. Every message goes through the workflow PROPOSE
 * endpoint, which already routes intent server-side:
 *   - a question / small talk  → the team answers in `chat` (free, status "intake")
 *   - an actionable job         → a plan + cost (status "proposed")
 * The plan lands as an inline card in the thread — the cost gate the merchant
 * trusts, now a message instead of a separate screen. Approve runs it.
 */

type Bubble =
  | { id: string; kind: "me"; text: string }
  | { id: string; kind: "team"; text: string }
  | { id: string; kind: "typing" }
  | {
      id: string;
      kind: "plan";
      docId: string;
      chat: string;
      tasks: WorkflowTask[];
      estimateCredits: number;
      credits: number;
      freeLeft: number;
      freeEligible: boolean;
      canAfford: boolean;
      state: "proposed" | "approving" | "done";
      note?: string;
    };

let seq = 0;
const uid = () => `b${(seq += 1)}`;

const STARTERS = [
  "How much did I earn this week?",
  "Who owes me money?",
  "Send a payment reminder",
];

export function TeamThread({
  projectId,
  initialGoal,
  onAddCredits,
}: {
  projectId: string;
  initialGoal?: string | null;
  onAddCredits?: () => void;
}) {
  const [items, setItems] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput({
    onResult: (t) => setText((p) => (p ? `${p} ${t}` : t)),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  // Greet, then — if the merchant already said what they need on the entry
  // screen — send it straight away so a plan is forming as they land.
  useEffect(() => {
    setItems([
      {
        id: uid(),
        kind: "team",
        text: "Hi, I'm your team. Tell me what you need, and I'll show the cost before doing anything. Your first jobs each month are free.",
      },
    ]);
    const g = initialGoal?.trim();
    if (g) void handleSend(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function put(...b: Bubble[]) {
    setItems((prev) => [...prev, ...b]);
  }
  function replace(id: string, b: Bubble) {
    setItems((prev) => prev.map((x) => (x.id === id ? b : x)));
  }
  function patchPlan(id: string, patch: Partial<Extract<Bubble, { kind: "plan" }>>) {
    setItems((prev) =>
      prev.map((x) => (x.id === id && x.kind === "plan" ? { ...x, ...patch } : x)),
    );
  }

  async function handleSend(message: string) {
    if (busy) return;
    const msg = message.trim();
    if (!msg) return;
    setText("");
    const typingId = uid();
    put({ id: uid(), kind: "me", text: msg }, { id: typingId, kind: "typing" });
    setBusy(true);
    try {
      const res = await proposeWorkflow(projectId, msg);
      if (res.status === "intake") {
        replace(typingId, {
          id: uid(),
          kind: "team",
          text: res.chat || "Tell me a bit more and I'll help.",
        });
      } else {
        const view = await getWorkflow(projectId, res.docId);
        replace(typingId, {
          id: uid(),
          kind: "plan",
          docId: res.docId,
          chat: res.chat,
          tasks: view.tasks,
          estimateCredits: view.estimateCredits,
          credits: view.balance.credits,
          freeLeft: view.balance.freeWorkflowsLeft,
          freeEligible: view.freeEligible,
          canAfford: view.canAfford,
          state: "proposed",
        });
      }
    } catch {
      replace(typingId, {
        id: uid(),
        kind: "team",
        text: "Sorry, I couldn't do that just now. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function approve(item: Extract<Bubble, { kind: "plan" }>) {
    patchPlan(item.id, { state: "approving", note: undefined });
    try {
      const res = await approveWorkflow(projectId, item.docId);
      if (res.ok) {
        patchPlan(item.id, { state: "done" });
        put({
          id: uid(),
          kind: "team",
          text: "On it — your team is working on this now. I'll keep the results in your jobs.",
        });
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        patchPlan(item.id, {
          state: "proposed",
          note: `Not enough cUSD credits — need ${res.need}, have ${res.have}. Add cUSD to run it.`,
        });
      } else if (res.code === "WORKFLOW_TOO_LARGE") {
        patchPlan(item.id, {
          state: "proposed",
          note: `That's a big job (max ${res.max} at once). Try breaking it into smaller asks.`,
        });
      } else {
        patchPlan(item.id, { state: "proposed", note: "Couldn't start that. Please try again." });
      }
    } catch {
      patchPlan(item.id, { state: "proposed", note: "Couldn't start that. Please try again." });
    }
  }

  const shown =
    voice.listening && voice.interim ? `${text ? `${text} ` : ""}${voice.interim}` : text;
  const showStarters = items.length <= 1 && !busy && !initialGoal;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-1 py-2">
        {items.map((b) => {
          if (b.kind === "me") {
            return (
              <div key={b.id} className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--accent)] px-3.5 py-2 text-sm text-white">
                {b.text}
              </div>
            );
          }
          if (b.kind === "team") {
            return (
              <div key={b.id} className="max-w-[85%] self-start whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-sm">
                {b.text}
              </div>
            );
          }
          if (b.kind === "typing") {
            return (
              <div key={b.id} className="self-start rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-[var(--muted)]">
                <span className="inline-flex gap-1" aria-label="Working">
                  <Dot /> <Dot /> <Dot />
                </span>
              </div>
            );
          }
          // plan card
          return (
            <div key={b.id} className="max-w-[92%] self-start rounded-2xl rounded-bl-md border border-[var(--accent)]/40 bg-white/5 p-3.5">
              {b.chat && <p className="mb-2 text-sm">{b.chat}</p>}
              <p className="mb-1 text-xs font-medium text-[var(--muted)]">Here&apos;s what I&apos;ll do:</p>
              <ul className="mb-2 flex flex-col gap-1">
                {b.tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[var(--muted)]">•</span>
                    <span className="min-w-0 flex-1">{t.title}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                <span className="text-[var(--muted)]">Cost</span>
                <span className="font-semibold">
                  {b.freeEligible ? (
                    <>
                      <span className="text-[#4ade80]">Free</span>{" "}
                      <span className="text-xs font-normal text-[var(--muted)]">
                        · {b.freeLeft} free left this month
                      </span>
                    </>
                  ) : (
                    <>≈ {b.estimateCredits} credits</>
                  )}
                </span>
              </div>
              {!b.freeEligible && (
                <p className="mt-0.5 text-right text-xs text-[var(--muted)]">You have {b.credits} credits</p>
              )}
              {b.note && (
                <p className="mt-2 rounded-xl bg-red-400/10 p-2 text-center text-xs text-red-200">{b.note}</p>
              )}

              {b.state === "done" ? (
                <p className="mt-2 text-center text-xs text-[#4ade80]">✓ Started</p>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  {!b.freeEligible && !b.canAfford ? (
                    <button
                      onClick={onAddCredits}
                      className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Add cUSD to run it
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => patchPlan(b.id, { state: "done", note: undefined })}
                        disabled={b.state === "approving"}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium disabled:opacity-60"
                      >
                        No thanks
                      </button>
                      <button
                        onClick={() => approve(b)}
                        disabled={b.state === "approving"}
                        className="flex-1 rounded-xl bg-[#12a150] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {b.state === "approving"
                          ? "Starting…"
                          : b.freeEligible
                            ? "Yes, do it (free)"
                            : `Yes, do it · ${b.estimateCredits} credits`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {showStarters && (
          <div className="mt-1 flex flex-wrap gap-2 self-start">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[var(--foreground)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer — speak or type */}
      <div className="mt-2 flex items-end gap-2 border-t border-white/10 pt-2.5">
        {voice.supported && (
          <button
            type="button"
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            aria-label={voice.listening ? "Stop listening" : "Speak"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base ${
              voice.listening ? "bg-red-500 text-white" : "bg-white/10 text-[var(--foreground)]"
            }`}
          >
            {voice.listening ? "■" : "🎙"}
          </button>
        )}
        <textarea
          value={shown}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend(text);
            }
          }}
          rows={1}
          placeholder={voice.listening ? "Listening…" : "Type what you need…"}
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl bg-white/5 px-3.5 py-2.5 text-sm outline-none placeholder-[var(--muted)]"
        />
        <button
          type="button"
          onClick={() => handleSend(text)}
          disabled={!text.trim() || busy}
          className="h-10 shrink-0 rounded-2xl bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />;
}
