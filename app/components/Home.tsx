"use client";

import { useCallback, useEffect, useState } from "react";
import {
  agentStatus,
  approveWorkflow,
  getBillingMe,
  getWorkflow,
  listActivity,
  listAgents,
  listProjects,
  listTasks,
  proposeWorkflow,
  type ActivityEvent,
  type Agent,
  type BillingMe,
  type Project,
  type Task,
  type Template,
  type WorkflowTask,
} from "../lib/perkosApi";
import { listTemplates } from "../lib/perkosApi";
import { Dashboard } from "./Dashboard";
import { glyphFor } from "../lib/templateMeta";
import { useIsMiniPay } from "../lib/useIsMiniPay";
import { useLandingNav } from "../lib/landingNav";
import { useWalletSession } from "../lib/useWalletSession";
import { WalletPanel } from "./WalletPanel";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { Brand } from "./Brand";
import { AgentChat } from "./AgentChat";
import { TemplateGallery } from "./TemplateGallery";

type Loaded = {
  agents: Agent[];
  projects: Project[];
  templates: Template[];
  billing: BillingMe | null;
  activity: ActivityEvent[];
  tasksByProject: Map<string, Task[]>;
};

export function Home({ address }: { address: string }) {
  // Logout is browser-only: inside MiniPay the wallet is the host identity
  // and connection is implicit (rule C1) — no logout affordance there.
  const isMiniPay = useIsMiniPay();
  const { logout } = useWalletSession();
  const { goToLanding } = useLandingNav();

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "gallery">("list");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [agents, projects, templates, billing, activity] = await Promise.all([
        listAgents(address),
        listProjects(address),
        listTemplates().catch(() => [] as Template[]),
        getBillingMe().catch(() => null),
        listActivity(address, 8).catch(() => [] as ActivityEvent[]),
      ]);
      // Aggregate tasks across the user's tools for the dashboard's ToDo +
      // per-tool summaries (listTasks is per-project).
      const taskLists = await Promise.all(
        projects.map((p) => listTasks(address, p.id).catch(() => [] as Task[])),
      );
      const tasksByProject = new Map(projects.map((p, i) => [p.id, taskLists[i] ?? []]));
      setData({ agents, projects, templates, billing, activity, tasksByProject });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your tools");
    }
  }, [address]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <main className="px-5 py-10 text-center text-sm text-[var(--muted)]">
        {error ?? "Loading…"}
      </main>
    );
  }

  const templateFor = (p: Project): Template | undefined =>
    data.templates.find((t) => t.id === (p as Project & { templateId?: string }).templateId);
  const roleLabel = (p: Project | undefined, agentName: string): { label: string; glyph: string } => {
    const tpl = p ? templateFor(p) : undefined;
    const role = tpl?.roles.find((r) => r.agentName === agentName);
    return { label: role?.label ?? agentName, glyph: tpl ? glyphFor(tpl.id) : "✦" };
  };

  const openProject = openProjectId
    ? data.projects.find((p) => p.id === openProjectId) ?? null
    : null;

  // --- Chat with one agent --------------------------------------------------
  if (chatAgent && openProject) {
    const { label, glyph } = roleLabel(openProject, chatAgent);
    return (
      <AgentChat
        address={address}
        projectId={openProject.id}
        agentName={chatAgent}
        label={label}
        glyph={glyph}
        onBack={() => setChatAgent(null)}
      />
    );
  }

  const header = (
    <header className="flex items-center justify-between">
      <button onClick={goToLanding} aria-label="Home" className="active:opacity-80">
        <Brand />
      </button>
      {!isMiniPay && (
        <button
          onClick={logout}
          className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Log out
        </button>
      )}
    </header>
  );

  // --- One activated tool (project) detail ---------------------------------
  if (openProject) {
    return (
      <ProjectView
        address={address}
        project={openProject}
        agents={data.agents}
        template={templateFor(openProject)}
        roleLabel={roleLabel}
        onBack={() => setOpenProjectId(null)}
        onOpenChat={setChatAgent}
        onReload={load}
      />
    );
  }

  const activeIds = new Set(
    data.projects.map((p) => (p as Project & { templateId?: string }).templateId).filter(Boolean) as string[],
  );

  // --- Gallery (browse & add tools) ----------------------------------------
  if (view === "gallery" || data.projects.length === 0) {
    return (
      <main className="flex flex-col gap-5 px-5 py-7">
        {header}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">
            {data.projects.length === 0 ? "Pick a tool to start" : "Add a tool"}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Simple money and customer helpers for your business — you pay only for the work.
          </p>
        </div>
        <WalletPanel address={address} />
        <DiagnosticPanel address={address} />
        <TemplateGallery
          activeTemplateIds={activeIds}
          onActivated={(projectId) => {
            setView("list");
            setOpenProjectId(projectId);
            load();
          }}
        />
        {data.projects.length > 0 && (
          <button
            onClick={() => setView("list")}
            className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
          >
            ‹ Back to my tools
          </button>
        )}
      </main>
    );
  }

  // --- Dashboard (default view once tools are activated) -------------------
  return (
    <main className="flex flex-col gap-5 px-5 py-7">
      {header}
      <Dashboard
        address={address}
        projects={data.projects}
        agents={data.agents}
        templates={data.templates}
        tasksByProject={data.tasksByProject}
        billing={data.billing}
        activity={data.activity}
        onOpenProject={setOpenProjectId}
        onAddTool={() => setView("gallery")}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </main>
  );
}

// ---------------------------------------------------------------------------

function ProjectView({
  address,
  project,
  agents,
  template,
  roleLabel,
  onBack,
  onOpenChat,
  onReload,
}: {
  address: string;
  project: Project;
  agents: Agent[];
  template: Template | undefined;
  roleLabel: (p: Project | undefined, name: string) => { label: string; glyph: string };
  onBack: () => void;
  onOpenChat: (agentName: string) => void;
  onReload: () => void;
}) {
  const [goal, setGoal] = useState(project.goal ?? "");
  const [phase, setPhase] = useState<
    "idle" | "proposing" | "intake" | "proposed" | "approving"
  >("idle");
  const [plan, setPlan] = useState<{
    docId: string;
    estimateCredits: number;
    tasks: WorkflowTask[];
    chat: string;
  } | null>(null);
  const [intakeChat, setIntakeChat] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ credits: number; freeWorkflowsLeft: number } | null>(null);
  const [freeEligible, setFreeEligible] = useState(false);
  const [canAfford, setCanAfford] = useState(false);
  const [needCredits, setNeedCredits] = useState<{ need: number; have: number } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTasks(address, project.id).then(setTasks).catch(() => setTasks([]));
  }, [address, project.id]);

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

  async function propose() {
    if (!goal.trim()) return;
    setPhase("proposing");
    setError(null);
    setNeedCredits(null);
    setIntakeChat(null);
    try {
      const res = await proposeWorkflow(project.id, goal.trim());
      if (res.status === "intake") {
        setIntakeChat(res.chat);
        setPhase("intake");
        return;
      }
      const view = await getWorkflow(project.id, res.docId);
      setPlan({ docId: res.docId, estimateCredits: view.estimateCredits, tasks: view.tasks, chat: res.chat });
      setBalance(view.balance);
      setFreeEligible(view.freeEligible);
      setCanAfford(view.canAfford);
      setPhase("proposed");
    } catch (e) {
      setError(errMsg(e));
      setPhase("idle");
    }
  }

  async function approve() {
    if (!plan) return;
    setPhase("approving");
    setError(null);
    setNeedCredits(null);
    try {
      const res = await approveWorkflow(project.id, plan.docId);
      if (res.ok) {
        setPlan(null);
        setGoal("");
        setPhase("idle");
        listTasks(address, project.id).then(setTasks).catch(() => {});
        onReload();
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        setNeedCredits({ need: res.need ?? 0, have: res.have ?? 0 });
        setPhase("proposed");
      } else if (res.code === "WORKFLOW_TOO_LARGE") {
        setError(
          `That's a big job (${res.estimateCredits} credits, max ${res.max} at once). Try breaking it into smaller asks.`,
        );
        setPhase("proposed");
      } else {
        setError("Couldn't start that. Please try again.");
        setPhase("proposed");
      }
    } catch (e) {
      setError(errMsg(e));
      setPhase("proposed");
    }
  }

  function discard() {
    setPlan(null);
    setNeedCredits(null);
    setError(null);
    setPhase("idle");
  }

  return (
    <main className="flex flex-col gap-5 px-5 py-7">
      <header className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="-ml-1 px-1 text-2xl leading-none">
          ‹
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{template?.name ?? project.name}</h1>
          {template?.tagline && (
            <p className="truncate text-xs text-[var(--muted)]">{template.tagline}</p>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted)]">
          Your helpers <span className="font-normal opacity-70">· tap to chat</span>
        </h2>
        {(project.agentIds ?? []).map((name) => {
          const agent = agents.find((a) => a.name === name);
          const { label, glyph } = roleLabel(project, name);
          const status = agent ? agentStatus(agent) : "provisioning";
          const dot =
            status === "online" ? "#4ade80" : status === "provisioning" ? "#fbbf24" : "#9ca3af";
          return (
            <button
              key={name}
              onClick={() => onOpenChat(name)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left active:scale-[0.99]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
                aria-hidden
              >
                {glyph}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
              <span className="shrink-0 text-lg text-[var(--muted)]" aria-hidden>›</span>
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--muted)]">Ask them to do something</h2>

        {/* Compose / intake: enter a goal, propose a plan */}
        {(phase === "idle" || phase === "proposing" || phase === "intake") && (
          <>
            {intakeChat && (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-amber-200/80">One quick question</p>
                <p>{intakeChat}</p>
              </div>
            )}
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Log today's sales and tell me what I earned this week"
              rows={3}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm outline-none"
            />
            <button
              onClick={propose}
              disabled={phase === "proposing" || !goal.trim()}
              className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              {phase === "proposing"
                ? "Planning…"
                : intakeChat
                  ? "Update & re-plan"
                  : "Plan this"}
            </button>
            <p className="text-center text-xs text-[var(--muted)]">
              You'll see the plan and its cost before anything runs.
            </p>
          </>
        )}

        {/* Proposal: show the plan + estimate + approve */}
        {(phase === "proposed" || phase === "approving") && plan && (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            {plan.chat && <p className="text-sm">{plan.chat}</p>}
            <ul className="flex flex-col gap-1.5">
              {plan.tasks.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--muted)]">•</span>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    {t.complexity}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
              <span className="text-[var(--muted)]">Cost</span>
              <span className="font-semibold">
                {freeEligible ? (
                  <>
                    <span className="text-[#4ade80]">Free</span>{" "}
                    <span className="text-xs font-normal text-[var(--muted)]">
                      ({balance?.freeWorkflowsLeft ?? 0} free left this month)
                    </span>
                  </>
                ) : (
                  <>≈ {plan.estimateCredits} credits</>
                )}
              </span>
            </div>
            {!freeEligible && balance && (
              <p className="-mt-1 text-right text-xs text-[var(--muted)]">
                You have {balance.credits} credits
              </p>
            )}

            {needCredits && (
              <p className="rounded-xl bg-red-400/10 p-2 text-center text-xs text-red-200">
                Not enough credits · need {needCredits.need}, have {needCredits.have}. Top up below.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={discard}
                disabled={phase === "approving"}
                className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium disabled:opacity-60"
              >
                Discard
              </button>
              <button
                onClick={approve}
                disabled={phase === "approving" || (!freeEligible && !canAfford)}
                className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-60"
              >
                {phase === "approving"
                  ? "Starting…"
                  : freeEligible
                    ? "Approve & run (free)"
                    : canAfford
                      ? `Approve & run · ${plan.estimateCredits} credits`
                      : "Top up to run"}
              </button>
            </div>
          </div>
        )}
      </section>

      {tasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-[var(--muted)]">What they're doing</h2>
          {tasks.map((t) => {
            const tone =
              t.status === "Done" ? "#4ade80" : t.status === "In progress" ? "#fbbf24" : "#9ca3af";
            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <p className="min-w-0 flex-1 truncate text-sm">{t.name}</p>
                <span className="ml-3 shrink-0 text-xs" style={{ color: tone }}>{t.status}</span>
              </div>
            );
          })}
        </section>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </main>
  );
}
