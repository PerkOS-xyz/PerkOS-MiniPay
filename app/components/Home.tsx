"use client";

import { useCallback, useEffect, useState } from "react";
import {
  agentStatus,
  giveGoal,
  listAgents,
  listProjects,
  listTasks,
  type Agent,
  type Project,
  type Task,
  type Template,
} from "../lib/perkosApi";
import { listTemplates } from "../lib/perkosApi";
import { glyphFor } from "../lib/templateMeta";
import { useIsMiniPay } from "../lib/useIsMiniPay";
import { useWalletSession } from "../lib/useWalletSession";
import { WalletPanel } from "./WalletPanel";
import { Brand } from "./Brand";
import { AgentChat } from "./AgentChat";
import { TemplateGallery } from "./TemplateGallery";

type Loaded = { agents: Agent[]; projects: Project[]; templates: Template[] };

export function Home({ address }: { address: string }) {
  // Logout is browser-only: inside MiniPay the wallet is the host identity
  // and connection is implicit (rule C1) — no logout affordance there.
  const isMiniPay = useIsMiniPay();
  const { logout } = useWalletSession();

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "gallery">("list");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [agents, projects, templates] = await Promise.all([
        listAgents(address),
        listProjects(address),
        listTemplates().catch(() => [] as Template[]),
      ]);
      setData({ agents, projects, templates });
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
      <Brand />
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

  // --- My tools (activated projects) ---------------------------------------
  return (
    <main className="flex flex-col gap-5 px-5 py-7">
      {header}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Your tools</h1>
        <p className="text-sm text-[var(--muted)]">Tap a tool to use it.</p>
      </div>
      <WalletPanel address={address} />
      <section className="flex flex-col gap-3">
        {data.projects.map((p) => {
          const tpl = templateFor(p);
          const online = (p.agentIds ?? []).some((n) =>
            data.agents.find((a) => a.name === n && agentStatus(a) === "online"),
          );
          return (
            <button
              key={p.id}
              onClick={() => setOpenProjectId(p.id)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left active:scale-[0.99]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
                aria-hidden
              >
                {tpl ? glyphFor(tpl.id) : "✦"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{tpl?.name ?? p.name}</p>
                <p className="text-xs text-[var(--muted)]">{tpl?.tagline ?? `${p.agentIds?.length ?? 0} helpers`}</p>
              </div>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: online ? "#4ade80" : "#9ca3af" }}
                aria-label={online ? "online" : "waking"}
              />
              <span className="shrink-0 text-lg text-[var(--muted)]" aria-hidden>›</span>
            </button>
          );
        })}
      </section>
      <button
        onClick={() => setView("gallery")}
        className="rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm font-medium text-[var(--muted)]"
      >
        + Add another tool
      </button>
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
  const [goalBusy, setGoalBusy] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTasks(address, project.id).then(setTasks).catch(() => setTasks([]));
  }, [address, project.id]);

  async function submitGoal() {
    if (!goal.trim()) return;
    setGoalBusy(true);
    setError(null);
    try {
      await giveGoal(address, project.id, goal.trim());
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that");
    } finally {
      setGoalBusy(false);
    }
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
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Log today's sales and tell me what I earned this week"
          rows={3}
          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm outline-none"
        />
        <button
          onClick={submitGoal}
          disabled={goalBusy || !goal.trim()}
          className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {goalBusy ? "Sending…" : "Send"}
        </button>
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
