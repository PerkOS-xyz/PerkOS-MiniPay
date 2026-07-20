"use client";

import { useState } from "react";

import {
  agentStatus,
  claimReward,
  type Agent,
  type ActivityEvent,
  type BillingMe,
  type Project,
  type Task,
  type Template,
} from "../lib/perkosApi";
import { glyphFor } from "../lib/templateMeta";
import { collectPendingTasks, countDoneTasks, toolTaskSummary } from "../lib/dashboardStats";
import { WalletPanel } from "./WalletPanel";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { CREDIT_USD } from "../lib/credits";
import { useLanguage } from "../lib/i18n";

/**
 * MiniPay in-app Dashboard (default view once the user has activated tools).
 * Reconciled to the shipped product: task-based CREDITS (not hours),
 * NON-CUSTODIAL (agents track/draft/remind, never move money), a SHARED fleet
 * (users activate templates = "tools"). So the numbers are credits / free
 * workflows / active tools / work done — never "money sent". Mobile-first
 * single column (the app body is capped at 28rem).
 */

type Props = {
  address: string;
  projects: Project[];
  agents: Agent[];
  templates: Template[];
  tasksByProject: Map<string, Task[]>;
  billing: BillingMe | null;
  activity: ActivityEvent[];
  onOpenProject: (id: string) => void;
  onAddTool: () => void;
  onRewardClaimed?: () => void;
};

export function Dashboard({
  address,
  projects,
  agents,
  templates,
  tasksByProject,
  billing,
  activity,
  onOpenProject,
  onAddTool,
  onRewardClaimed,
}: Props) {
  const { locale } = useLanguage();
  const es = locale === "es";
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const r = await claimReward();
      if (r.ok) onRewardClaimed?.();
    } finally {
      setClaiming(false);
    }
  }
  const templateFor = (p: Project) =>
    templates.find((t) => t.id === (p as Project & { templateId?: string }).templateId);
  const isOnline = (p: Project) =>
    (p.agentIds ?? []).some((n) => agents.find((a) => a.name === n && agentStatus(a) === "online"));

  const tasksDone = countDoneTasks(tasksByProject);
  const pending = collectPendingTasks(projects, tasksByProject, 5);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const onlineCount = projects.filter(isOnline).length;

  const credits = billing?.credits ?? 0;
  const exempt = billing?.exempt ?? false;
  const tier = billing?.membershipTier ?? "free";
  const tierLabel = tier === "free" ? (es ? "Gratis" : "Free") : tier.charAt(0).toUpperCase() + tier.slice(1);
  const analysesLeft = billing?.analysesLeft;
  const analysisCap = billing?.monthlyAnalysisCap;

  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <section className="grid grid-cols-2 gap-3">
        <Stat
          emoji="💳"
          label={es ? "Créditos" : "Credits"}
          value={billing ? String(credits) : null}
          secondary={billing ? `≈ $${(credits * CREDIT_USD).toFixed(2)}` : ""}
        />
        <Stat
          emoji="🎟️"
          label={es ? "Plan" : "Plan"}
          value={billing ? (exempt ? (es ? "Patrocinado" : "Sponsored") : tierLabel) : null}
          secondary={
            exempt
              ? es ? "Sin límite" : "Unlimited"
              : analysesLeft != null && analysisCap != null
                ? es ? `${analysesLeft}/${analysisCap} análisis disponibles` : `${analysesLeft}/${analysisCap} analyses left`
                : es ? "este mes" : "this month"
          }
        />
        <Stat
          emoji="🧰"
          label={es ? "Herramientas activas" : "Active tools"}
          value={String(projects.length)}
          secondary={onlineCount > 0 ? (es ? `${onlineCount} en línea` : `${onlineCount} online now`) : es ? "iniciando" : "warming up"}
        />
        <Stat emoji="✅" label={es ? "Trabajos listos" : "Jobs done"} value={String(tasksDone)} secondary={es ? "total" : "all time"} />
      </section>

      {/* Free monthly reward — manual claim, tops up to the target */}
      {billing?.rewardClaimable && !exempt ? (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="flex items-center gap-3 rounded-2xl border border-[#4ade80]/40 bg-[#4ade80]/10 p-4 text-left active:scale-[0.99] disabled:opacity-60"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4ade80]/20 text-lg" aria-hidden>
            🎁
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-[#4ade80]">
              {claiming ? (es ? "Reclamando…" : "Claiming…") : es ? `Reclamar ${(billing.rewardTarget ?? 15) - credits} créditos gratis` : `Claim ${(billing.rewardTarget ?? 15) - credits} free credits`}
            </span>
            <span className="block text-xs text-[var(--muted)]">
              {es ? "Planifica con tu equipo y recibe créditos gratis cada mes." : "Plan with your team and receive free credits each month."}
            </span>
          </span>
        </button>
      ) : null}

      {/* Buy credits (packs) */}
      <WalletPanel address={address} compact />

      {/* What your team is on */}
      <section className="flex flex-col gap-2">
        <SectionHeader label={es ? "Necesita tu atención" : "Needs your attention"} count={pending.length || undefined} />
        {pending.length === 0 ? (
          <EmptyCard text={es ? "Nada pendiente. Dale un objetivo a una herramienta para empezar." : "Nothing queued. Give a tool a goal to get started."} />
        ) : (
          pending.map((t) => {
            const proj = projectById.get(t.projectId);
            return (
            <button
              key={t.id}
              onClick={() => onOpenProject(t.projectId)}
              className="flex min-h-[56px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left active:scale-[0.99]"
            >
              <StatusChip status={t.status} locale={locale} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.name}</span>
                <span className="block truncate text-xs text-[var(--muted)]">
                  {(proj && templateFor(proj)?.name) ?? proj?.name ?? t.projectId}
                </span>
              </span>
              <span className="shrink-0 text-lg text-[var(--muted)]" aria-hidden>
                ›
              </span>
            </button>
            );
          })
        )}
      </section>

      {/* Your tools */}
      <section className="flex flex-col gap-2">
        <SectionHeader label={es ? "Tus herramientas" : "Your tools"} />
        {projects.map((p) => {
          const tpl = templateFor(p);
          const tasks = tasksByProject.get(p.id) ?? [];
          const { queued, done } = toolTaskSummary(tasks);
          const summary =
            queued > 0
              ? es ? `${queued} en progreso` : `${queued} in progress`
              : done > 0
                ? es ? `${done} listos` : `${done} done`
                : tpl?.tagline ?? (es ? `${p.agentIds?.length ?? 0} asistentes` : `${p.agentIds?.length ?? 0} helpers`);
          return (
            <button
              key={p.id}
              onClick={() => onOpenProject(p.id)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left active:scale-[0.99]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
                aria-hidden
              >
                {tpl ? glyphFor(tpl.id) : "✦"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{tpl?.name ?? p.name}</span>
                <span className="block truncate text-xs text-[var(--muted)]">{summary}</span>
              </span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: isOnline(p) ? "#4ade80" : "#9ca3af" }}
                aria-label={
                  isOnline(p)
                    ? es ? "en línea" : "online"
                    : es ? "iniciando" : "warming up"
                }
              />
              <span className="shrink-0 text-lg text-[var(--muted)]" aria-hidden>
                ›
              </span>
            </button>
          );
        })}
        <button
          onClick={onAddTool}
          className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 text-sm font-medium text-[var(--accent)] active:bg-white/5"
        >
          {es ? "＋ Agregar una herramienta" : "＋ Add a tool"}
        </button>
      </section>

      {/* Recent activity */}
      <section className="flex flex-col gap-1">
        <SectionHeader label={es ? "Actividad reciente" : "Recent activity"} />
        {activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            {es ? "Todavía no hay actividad. Cuando tu equipo empiece a trabajar, aparecerá aquí." : "No activity yet. Once your tools start working, you'll see it here."}
          </p>
        ) : (
          activity.slice(0, 6).map((e) => {
            const v = verbView(e.verb, locale);
            return (
              <div key={e.id} className="flex items-start gap-2.5 py-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-xs">
                  {v.emoji}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{e.actor || (es ? "Tu equipo" : "Your team")}</span> {v.phrase}{" "}
                  <span className="text-[var(--muted)]">{e.object}</span>
                  {e.detail ? <span className="text-[var(--muted)]"> · {e.detail}</span> : null}
                </span>
                <span className="shrink-0 pt-0.5 text-[11px] text-[var(--muted)]">
                  {relTime(e.ts, locale)}
                </span>
              </div>
            );
          })
        )}
      </section>

      {/* Diagnostics (kept, minor) */}
      <DiagnosticPanel address={address} />
    </div>
  );
}

function Stat({
  emoji,
  label,
  value,
  secondary,
}: {
  emoji: string;
  label: string;
  value: string | null;
  secondary: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
        <span aria-hidden>{emoji}</span>
        {label}
      </span>
      {value === null ? (
        <span className="h-7 w-16 animate-pulse rounded bg-white/10" />
      ) : (
        <span className="text-2xl font-bold leading-tight tabular-nums">{value}</span>
      )}
      <span className="text-xs text-[var(--muted)]">{secondary}</span>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</h2>
      {count ? <span className="text-xs text-[var(--muted)]">{count}</span> : null}
    </div>
  );
}

function StatusChip({ status, locale }: { status: Task["status"]; locale: "en" | "es" }) {
  const cls =
    status === "In progress"
      ? "bg-[var(--accent)]/20 text-[var(--accent)]"
      : status === "Review"
        ? "bg-amber-400/15 text-amber-300"
        : "bg-white/10 text-[var(--muted)]";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}>
      {locale === "es"
        ? status === "In progress"
          ? "En progreso"
          : status === "Review"
            ? "Revisar"
            : status === "Done"
              ? "Listo"
              : status
        : status}
    </span>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function verbView(verb: string, locale: "en" | "es"): { emoji: string; phrase: string } {
  const es = locale === "es";
  switch (verb) {
    case "proposed_plan":
      return { emoji: "🧭", phrase: es ? "propuso un plan" : "proposed a plan" };
    case "approved_plan":
      return { emoji: "👍", phrase: es ? "aprobó" : "approved" };
    case "planned":
      return { emoji: "🗂️", phrase: es ? "planificó" : "planned" };
    case "created_task":
      return { emoji: "🗂️", phrase: es ? "agregó" : "added" };
    case "started_task":
      return { emoji: "▶️", phrase: es ? "inició" : "started" };
    case "completed_task":
      return { emoji: "✅", phrase: es ? "terminó" : "finished" };
    case "moved_task":
      return { emoji: "↔️", phrase: es ? "actualizó" : "updated" };
    case "retried_task":
      return { emoji: "🔁", phrase: es ? "reintentó" : "retried" };
    case "goal_done":
      return { emoji: "🎉", phrase: es ? "completó el objetivo" : "finished the goal" };
    case "launched_agent":
      return { emoji: "🚀", phrase: es ? "activó" : "launched" };
    case "agent_online":
      return { emoji: "🟢", phrase: es ? "se conectó" : "came online" };
    case "created_project":
      return { emoji: "✨", phrase: es ? "creó" : "created" };
    default:
      return { emoji: "•", phrase: verb.replace(/_/g, " ") };
  }
}

function relTime(ts: number, locale: "en" | "es"): string {
  const es = locale === "es";
  if (!ts) return "";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return es ? "ahora" : "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return es ? "ayer" : "yesterday";
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}
