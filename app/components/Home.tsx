"use client";

import { useCallback, useEffect, useState } from "react";
import {
  agentStatus,
  getBillingMe,
  listActivity,
  listAgents,
  listProjects,
  listTasks,
  type ActivityEvent,
  type Agent,
  type BillingMe,
  type Project,
  type Task,
  type Template,
} from "../lib/perkosApi";
import { listTemplates } from "../lib/perkosApi";
import { Dashboard } from "./Dashboard";
import { glyphFor } from "../lib/templateMeta";
import { useIsMiniPay } from "../lib/useIsMiniPay";
import { useLandingNav } from "../lib/landingNav";
import { useWalletSession } from "../lib/useWalletSession";
import { WalletPanel } from "./WalletPanel";
import { Brand } from "./Brand";
import { AgentChat } from "./AgentChat";
import { TemplateGallery } from "./TemplateGallery";
import { NeedToday } from "./NeedToday";
import { TeamThread } from "./TeamThread";
import { ServerWallet } from "./ServerWallet";

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
  const [view, setView] = useState<"list" | "gallery" | "wallet">("list");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  // Carried in from the first-run "what do you need?" box so the team thread
  // opens with the merchant's own words already sent.
  const [initialGoal, setInitialGoal] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Couldn't load your team");
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

  // --- Talk to one helper alone (optional 1:1) ------------------------------
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView("wallet")}
          className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Team wallet
        </button>
        {!isMiniPay && (
          <button
            onClick={logout}
            className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
          >
            Log out
          </button>
        )}
      </div>
    </header>
  );

  // --- One activated tool (project) — the team thread ----------------------
  if (openProject) {
    return (
      <ProjectView
        project={openProject}
        agents={data.agents}
        template={templateFor(openProject)}
        roleLabel={roleLabel}
        initialGoal={initialGoal}
        onBack={() => {
          setOpenProjectId(null);
          setInitialGoal(null);
        }}
        onOpenChat={setChatAgent}
        onAddCredits={() => {
          setOpenProjectId(null);
          setInitialGoal(null);
          setView("gallery");
        }}
      />
    );
  }

  const activeIds = new Set(
    data.projects.map((p) => (p as Project & { templateId?: string }).templateId).filter(Boolean) as string[],
  );

  // --- First run: one question, speak-or-type + a few common chores --------
  if (data.projects.length === 0) {
    return (
      <NeedToday
        onStarted={(projectId, goal) => {
          setInitialGoal(goal ?? null);
          setView("list");
          setOpenProjectId(projectId);
          load();
        }}
      />
    );
  }

  // --- Gallery: add another helper (reached via "Add a helper") -------------
  if (view === "gallery") {
    return (
      <main className="flex flex-col gap-5 px-5 py-7">
        {header}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Add a helper</h1>
          <p className="text-sm text-[var(--muted)]">
            More money and customer helpers for your business — you only pay for the work.
          </p>
        </div>
        <WalletPanel address={address} />
        <TemplateGallery
          activeTemplateIds={activeIds}
          onActivated={(projectId) => {
            setView("list");
            setOpenProjectId(projectId);
            load();
          }}
        />
        <button
          onClick={() => setView("list")}
          className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
        >
          ‹ Back to my team
        </button>
      </main>
    );
  }

  // --- Team wallet (server wallet: address + Celo balance + deposit) -------
  if (view === "wallet") {
    return (
      <main className="flex flex-col gap-5 px-5 py-7">
        {header}
        <ServerWallet />
        <button
          onClick={() => setView("list")}
          className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
        >
          ‹ Back to my team
        </button>
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
  project,
  agents,
  template,
  roleLabel,
  initialGoal,
  onBack,
  onOpenChat,
  onAddCredits,
}: {
  project: Project;
  agents: Agent[];
  template: Template | undefined;
  roleLabel: (p: Project | undefined, name: string) => { label: string; glyph: string };
  initialGoal?: string | null;
  onBack: () => void;
  onOpenChat: (agentName: string) => void;
  onAddCredits: () => void;
}) {
  return (
    <main className="flex h-[100dvh] flex-col px-5 pb-3 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="-ml-1 px-1 text-2xl leading-none">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{template?.name ?? project.name}</h1>
          <p className="truncate text-xs text-[var(--muted)]">
            Your team · tap a helper to talk to them alone
          </p>
        </div>
      </header>

      {/* The fleet is your team. Tapping a helper opens a 1:1 (optional); the
          main way to get things done is the one thread below. */}
      {(project.agentIds ?? []).length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-xs"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)", color: "#fff" }}
                  aria-hidden
                >
                  {glyph}
                </span>
                <span className="text-xs">{label}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <TeamThread projectId={project.id} initialGoal={initialGoal} onAddCredits={onAddCredits} />
      </div>
    </main>
  );
}
