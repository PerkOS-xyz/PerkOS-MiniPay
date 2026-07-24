"use client";

import { useEffect, useRef, useState } from "react";

import {
  approveWorkflow,
  getWorkflow,
  proposeWorkflow,
  revealWorkflow,
  type PreviewTask,
  type WorkflowTask,
} from "../lib/perkosApi";
import { useVoiceInput } from "../lib/useVoiceInput";
import { creditsToUsd } from "../lib/credits";
import { useLanguage } from "../lib/i18n";

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
      /** proposed→approving→(legacy)done | (new)running→preview→revealing→revealed */
      state: "proposed" | "approving" | "done" | "running" | "preview" | "revealing" | "revealed";
      /** See-before-you-pay flow on for this workflow (from the API flag). */
      previewReveal?: boolean;
      progress?: { tasksTotal: number; tasksDone: number };
      preview?: PreviewTask[];
      results?: Array<{ taskId: string; title: string; agent: string; result: string | null }>;
      note?: string;
    };

let seq = 0;
const uid = () => `b${(seq += 1)}`;

const STARTERS = {
  en: ["Reply to this customer", "Write a short promotion", "Organize these notes"],
  es: ["Responder a este cliente", "Escribir una promoción corta", "Organizar estas notas"],
  pt: ["Responder a este cliente", "Escrever uma promoção curta", "Organizar estas anotações"],
};

export function TeamThread({
  projectId,
  initialGoal,
  onAddCredits,
}: {
  projectId: string;
  initialGoal?: string | null;
  onAddCredits?: () => void;
}) {
  const { locale } = useLanguage();
  const t = locale === "es"
    ? {
        greeting: "Hola, soy Anna. Dime qué necesitas y te mostraré el costo antes de hacer algo. Tus primeros trabajos de cada mes son gratis.",
        more: "Cuéntame un poco más y te ayudaré.",
        failed: "Lo siento, no pude hacerlo ahora. Inténtalo nuevamente.",
        workingJobs: "Ya empecé. Guardaré los resultados en tus trabajos cuando estén listos.",
        insufficient: (need?: number, have?: number) => `No tienes suficientes créditos. Necesitas ${need}, tienes ${have}. Agrega fondos para continuar.`,
        tooLarge: (max?: number) => `Es un trabajo grande (máximo ${max} a la vez). Intenta dividirlo en solicitudes más pequeñas.`,
        startFailed: "No se pudo iniciar. Inténtalo nuevamente.",
        unlockInsufficient: (need?: number, have?: number) => `Necesitas ${need} créditos para desbloquearlo y tienes ${have}. Agrega fondos o mejora tu plan.`,
        finishing: "Todavía estamos terminando. Un momento.",
        unlockFailed: "No se pudo desbloquear ahora. Inténtalo nuevamente.",
        plan: "Esto es lo que haré:",
        cost: "Costo máximo",
        free: "Gratis",
        freeLeft: (n: number) => `${n} gratis este mes`,
        balance: (n: number) => `Tienes ${n} créditos`,
        started: "Iniciado",
        working: "Anna está trabajando…",
        preview: "Ya está listo. Aquí tienes un adelanto",
        locked: "Bloqueado",
        unlock: (n: number) => `Desbloquear resultados · ${n} créditos`,
        addUnlock: (n: number) => `Agregar fondos para desbloquear · necesitas ${n}`,
        unlocking: "Desbloqueando…",
        done: "Listo",
        addRun: "Agregar fondos para ejecutarlo",
        decline: "Ahora no",
        starting: "Iniciando…",
        approveFree: "Sí, hazlo gratis",
        approve: (n: number) => `Aprobar · ${n} créditos ($${creditsToUsd(n)})`,
        stop: "Dejar de escuchar",
        speak: "Hablar",
        listening: "Escuchando…",
        placeholder: "Escribe lo que necesitas…",
        send: "Enviar",
        workingLabel: "Trabajando",
      }
    : locale === "pt"
      ? {
        greeting: "Olá, eu sou Anna. Diga o que precisa e mostrarei o custo antes de fazer qualquer coisa. Seus primeiros trabalhos de cada mês são grátis.",
        more: "Conte um pouco mais e eu ajudarei.",
        failed: "Desculpe, não consegui fazer isso agora. Tente novamente.",
        workingJobs: "Já comecei. Vou guardar os resultados nos seus trabalhos quando estiverem prontos.",
        insufficient: (need?: number, have?: number) => `Créditos insuficientes. Você precisa de ${need} e tem ${have}. Adicione fundos para continuar.`,
        tooLarge: (max?: number) => `Este é um trabalho grande (máximo de ${max} por vez). Tente dividi-lo em pedidos menores.`,
        startFailed: "Não foi possível iniciar. Tente novamente.",
        unlockInsufficient: (need?: number, have?: number) => `Você precisa de ${need} créditos para desbloquear e tem ${have}. Adicione fundos ou melhore seu plano.`,
        finishing: "Ainda estamos terminando. Só um momento.",
        unlockFailed: "Não foi possível desbloquear agora. Tente novamente.",
        plan: "Veja o que farei:",
        cost: "Custo máximo",
        free: "Grátis",
        freeLeft: (n: number) => `${n} grátis neste mês`,
        balance: (n: number) => `Você tem ${n} créditos`,
        started: "Iniciado",
        working: "Anna está trabalhando…",
        preview: "Está pronto. Veja uma prévia",
        locked: "Bloqueado",
        unlock: (n: number) => `Desbloquear resultados completos · ${n} créditos`,
        addUnlock: (n: number) => `Adicionar fundos para desbloquear · precisa de ${n}`,
        unlocking: "Desbloqueando…",
        done: "Concluído",
        addRun: "Adicionar fundos para executar",
        decline: "Agora não",
        starting: "Iniciando…",
        approveFree: "Sim, faça grátis",
        approve: (n: number) => `Aprovar · ${n} créditos ($${creditsToUsd(n)})`,
        stop: "Parar de ouvir",
        speak: "Falar",
        listening: "Ouvindo…",
        placeholder: "Escreva o que precisa…",
        send: "Enviar",
        workingLabel: "Trabalhando",
      }
    : {
        greeting: "Hi, I'm Anna. Tell me what you need, and I'll show the cost before doing anything. Your first jobs each month are free.",
        more: "Tell me a bit more and I'll help.",
        failed: "Sorry, I couldn't do that just now. Please try again.",
        workingJobs: "I'm on it. I'll keep the results in your jobs when they're ready.",
        insufficient: (need?: number, have?: number) => `Not enough credits. You need ${need} and have ${have}. Add funds to run it.`,
        tooLarge: (max?: number) => `That's a big job (max ${max} at once). Try breaking it into smaller asks.`,
        startFailed: "Couldn't start that. Please try again.",
        unlockInsufficient: (need?: number, have?: number) => `You need ${need} credits to unlock it and have ${have}. Add funds or upgrade.`,
        finishing: "Still finishing. One moment.",
        unlockFailed: "Couldn't unlock just now. Please try again.",
        plan: "Here's what I'll do:",
        cost: "Maximum cost",
        free: "Free",
        freeLeft: (n: number) => `${n} free this month`,
        balance: (n: number) => `You have ${n} credits`,
        started: "Started",
        working: "Anna is working…",
        preview: "It's ready. Here's a preview",
        locked: "Locked",
        unlock: (n: number) => `Unlock full results · ${n} credits`,
        addUnlock: (n: number) => `Add funds to unlock · need ${n}`,
        unlocking: "Unlocking…",
        done: "Done",
        addRun: "Add funds to run it",
        decline: "No thanks",
        starting: "Starting…",
        approveFree: "Yes, do it free",
        approve: (n: number) => `Approve · ${n} credits ($${creditsToUsd(n)})`,
        stop: "Stop listening",
        speak: "Speak",
        listening: "Listening…",
        placeholder: "Type what you need…",
        send: "Send",
        workingLabel: "Working",
      };
  const [items, setItems] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const greetingId = useRef(uid());
  const mounted = useRef(true);
  const polling = useRef<Set<string>>(new Set());
  const voice = useVoiceInput({
    onResult: (t) => setText((p) => (p ? `${p} ${t}` : t)),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Greet, then — if the merchant already said what they need on the entry
  // screen — send it straight away so a plan is forming as they land.
  useEffect(() => {
    setItems([
      {
        id: greetingId.current,
        kind: "team",
        text: t.greeting,
      },
    ]);
    const g = initialGoal?.trim();
    if (g) void handleSend(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the built-in greeting in sync when the user changes language without
  // touching real user/agent messages already in the conversation.
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === greetingId.current && item.kind === "team"
          ? { ...item, text: t.greeting }
          : item,
      ),
    );
  }, [locale]);

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
          text: res.chat || t.more,
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
          previewReveal: view.previewReveal ?? false,
          state: "proposed",
        });
      }
    } catch {
      replace(typingId, {
        id: uid(),
        kind: "team",
        text: t.failed,
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
        if (res.reserved) {
          // See-before-you-pay: the team runs, then we preview before charging.
          patchPlan(item.id, { state: "running", progress: { tasksTotal: item.tasks.length, tasksDone: 0 } });
          void pollUntilPreview(item.id, item.docId);
        } else {
          // Legacy: charged at accept, results land in the jobs board.
          patchPlan(item.id, { state: "done" });
          put({
            id: uid(),
            kind: "team",
            text: t.workingJobs,
          });
        }
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        patchPlan(item.id, {
          state: "proposed",
          note: t.insufficient(res.need, res.have),
        });
      } else if (res.code === "WORKFLOW_TOO_LARGE") {
        patchPlan(item.id, {
          state: "proposed",
          note: t.tooLarge(res.max),
        });
      } else {
        patchPlan(item.id, { state: "proposed", note: t.startFailed });
      }
    } catch {
      patchPlan(item.id, { state: "proposed", note: t.startFailed });
    }
  }

  /** Poll the workflow while the team runs; surface the preview when it's ready. */
  async function pollUntilPreview(bubbleId: string, docId: string) {
    if (polling.current.has(bubbleId)) return;
    polling.current.add(bubbleId);
    try {
      for (let i = 0; i < 90 && mounted.current; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        if (!mounted.current) return;
        let view;
        try {
          view = await getWorkflow(projectId, docId);
        } catch {
          continue; // transient — keep polling
        }
        if (view.progress) patchPlan(bubbleId, { progress: view.progress });
        if (view.workflowState === "preview" || view.workflowState === "settled") {
          patchPlan(bubbleId, {
            state: view.workflowState === "settled" ? "revealed" : "preview",
            preview: view.preview ?? [],
            canAfford: view.canAfford,
            credits: view.balance.credits,
            results:
              view.workflowState === "settled"
                ? (view.preview ?? []).map((p) => ({ taskId: p.taskId, title: p.title, agent: p.agent, result: p.result }))
                : undefined,
          });
          return;
        }
      }
    } finally {
      polling.current.delete(bubbleId);
    }
  }

  async function reveal(item: Extract<Bubble, { kind: "plan" }>) {
    patchPlan(item.id, { state: "revealing", note: undefined });
    try {
      const res = await revealWorkflow(projectId, item.docId);
      if (res.ok) {
        patchPlan(item.id, {
          state: "revealed",
          results: res.results,
          credits: res.balanceAfter ?? item.credits,
        });
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        patchPlan(item.id, {
          state: "preview",
          canAfford: false,
          note: t.unlockInsufficient(res.need, res.have),
        });
      } else if (res.code === "NOT_READY") {
        patchPlan(item.id, { state: "running", note: t.finishing });
        void pollUntilPreview(item.id, item.docId);
      } else {
        patchPlan(item.id, { state: "preview", note: t.unlockFailed });
      }
    } catch {
      patchPlan(item.id, { state: "preview", note: t.unlockFailed });
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
                <span className="inline-flex gap-1" aria-label={t.workingLabel}>
                  <Dot /> <Dot /> <Dot />
                </span>
              </div>
            );
          }
          // plan card
          return (
            <div key={b.id} className="max-w-[92%] self-start rounded-2xl rounded-bl-md border border-[var(--accent)]/40 bg-white/5 p-3.5">
              {b.chat && <p className="mb-2 text-sm">{b.chat}</p>}
              <p className="mb-1 text-xs font-medium text-[var(--muted)]">{t.plan}</p>
              <ul className="mb-2 flex flex-col gap-1">
                {b.tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[var(--muted)]">•</span>
                    <span className="min-w-0 flex-1">{t.title}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                <span className="text-[var(--muted)]">{t.cost}</span>
                <span className="font-semibold">
                  {b.freeEligible ? (
                    <>
                      <span className="text-[#4ade80]">{t.free}</span>{" "}
                      <span className="text-xs font-normal text-[var(--muted)]">
                        · {t.freeLeft(b.freeLeft)}
                      </span>
                    </>
                  ) : (
                    <>{b.estimateCredits} credits · ≈ ${creditsToUsd(b.estimateCredits)} max</>
                  )}
                </span>
              </div>
              {!b.freeEligible && (
                <p className="mt-0.5 text-right text-xs text-[var(--muted)]">{t.balance(b.credits)}</p>
              )}
              {b.note && (
                <p className="mt-2 rounded-xl bg-red-400/10 p-2 text-center text-xs text-red-200">{b.note}</p>
              )}

              {b.state === "done" ? (
                <p className="mt-2 text-center text-xs text-[#4ade80]">✓ {t.started}</p>
              ) : b.state === "running" ? (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                  <span className="inline-flex gap-1" aria-label={t.workingLabel}>
                    <Dot /> <Dot /> <Dot />
                  </span>
                  {t.working}
                  {b.progress ? ` (${b.progress.tasksDone}/${b.progress.tasksTotal})` : ""}
                </div>
              ) : b.state === "preview" ? (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-center text-xs font-medium text-[#4ade80]">
                    ✓ {t.preview}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {(b.preview ?? []).map((p) => (
                      <li key={p.taskId} className="rounded-xl bg-white/5 p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 font-medium">{p.title}</span>
                          <span className="shrink-0 text-[var(--muted)]" aria-label={t.locked}>🔒</span>
                        </div>
                        {p.snippet && (
                          <p className="mt-0.5 text-xs text-[var(--muted)]">{p.snippet}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {b.note && (
                    <p className="rounded-xl bg-red-400/10 p-2 text-center text-xs text-red-200">{b.note}</p>
                  )}
                  {b.canAfford ? (
                    <button
                      onClick={() => reveal(b)}
                      className="rounded-xl bg-[#12a150] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      {t.unlock(b.estimateCredits)}
                    </button>
                  ) : (
                    <button
                      onClick={onAddCredits}
                      className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      {t.addUnlock(b.estimateCredits)}
                    </button>
                  )}
                </div>
              ) : b.state === "revealing" ? (
                <p className="mt-2 text-center text-xs text-[var(--muted)]">{t.unlocking}</p>
              ) : b.state === "revealed" ? (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-center text-xs font-medium text-[#4ade80]">✓ {t.done}</p>
                  <ul className="flex flex-col gap-1.5">
                    {(b.results ?? []).map((r) => (
                      <li key={r.taskId} className="rounded-xl bg-white/5 p-2 text-sm">
                        <p className="font-medium">{r.title}</p>
                        {r.result && (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-[var(--foreground)]">{r.result}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  {!b.freeEligible && !b.canAfford ? (
                    <button
                      onClick={onAddCredits}
                      className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      {t.addRun}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => patchPlan(b.id, { state: "done", note: undefined })}
                        disabled={b.state === "approving"}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium disabled:opacity-60"
                      >
                        {t.decline}
                      </button>
                      <button
                        onClick={() => approve(b)}
                        disabled={b.state === "approving"}
                        className="flex-1 rounded-xl bg-[#12a150] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {b.state === "approving"
                          ? t.starting
                          : b.freeEligible
                            ? t.approveFree
                            : t.approve(b.estimateCredits)}
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
            {STARTERS[locale].map((s) => (
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
            aria-label={voice.listening ? t.stop : t.speak}
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
          placeholder={voice.listening ? t.listening : t.placeholder}
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl bg-white/5 px-3.5 py-2.5 text-sm outline-none placeholder-[var(--muted)]"
        />
        <button
          type="button"
          onClick={() => handleSend(text)}
          disabled={!text.trim() || busy}
          className="h-10 shrink-0 rounded-2xl bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {t.send}
        </button>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />;
}
