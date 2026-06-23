"use client";

import { useCallback, useEffect, useState } from "react";
import {
  agentStatus,
  createProject,
  ensureDefaultOrg,
  giveGoal,
  launchAgent,
  listAgents,
  listProjects,
  listTasks,
  setProjectTeam,
  type Agent,
  type Project,
  type Task,
} from "../lib/perkosApi";
import { renderSoulMd, STARTER_TEAM } from "../lib/souls";
import { WalletPanel } from "./WalletPanel";

const IMAGE_TAG = process.env.NEXT_PUBLIC_PERKOS_DEFAULT_IMAGE_TAG || undefined;

type Loaded = { orgId: string; agents: Agent[]; project: Project | null; tasks: Task[] };

export function Home({ address }: { address: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const orgId = await ensureDefaultOrg(address);
      const [agents, projects] = await Promise.all([
        listAgents(address),
        listProjects(address, orgId),
      ]);
      const project = projects.find((p) => p.pmAgent) ?? projects[0] ?? null;
      const tasks = project ? await listTasks(address, project.id) : [];
      setData({ orgId, agents, project, tasks });
      if (project?.goal) setGoal(project.goal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your team");
    }
  }, [address]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function startTeam() {
    if (!data) return;
    setError(null);
    try {
      const projectId = await createProject(address, { name: "My team", orgId: data.orgId });
      const launched: string[] = [];
      for (const role of STARTER_TEAM) {
        setLaunching(role.role);
        const res = await launchAgent({
          walletAddress: address,
          runtime: role.runtime,
          name: role.role,
          soul: renderSoulMd(role.soul),
          deployMode: "perkos-managed",
          imageTag: IMAGE_TAG ?? null,
        });
        launched.push(res.result.agent?.name ?? role.role);
      }
      const pm = STARTER_TEAM.find((r) => r.isPM)?.role ?? launched[0];
      await setProjectTeam(address, projectId, launched, pm);
      setLaunching(null);
      await load();
    } catch (e) {
      setLaunching(null);
      setError(e instanceof Error ? e.message : "Couldn't start your team");
    }
  }

  async function submitGoal() {
    if (!data?.project || !goal.trim()) return;
    setGoalBusy(true);
    setError(null);
    try {
      await giveGoal(address, data.project.id, goal.trim());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the goal");
    } finally {
      setGoalBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="px-5 py-10 text-center text-sm text-[var(--muted)]">
        {error ?? "Loading your team…"}
      </main>
    );
  }

  const hasTeam = Boolean(data.project && (data.project.agentIds?.length ?? 0) > 0);
  const session = data.project?.pmSession;

  return (
    <main className="flex flex-col gap-5 px-5 py-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Your AI team</h1>
        <p className="text-sm text-[var(--muted)]">
          {hasTeam ? "Give them a goal and they get to work." : "Start your free team to begin."}
        </p>
      </header>

      <WalletPanel />

      {!hasTeam ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">Your starter team</h2>
          {STARTER_TEAM.map((m) => (
            <TeamMember key={m.role} glyph={m.glyph} name={m.role} blurb={m.blurb} status={null} />
          ))}
          <button
            onClick={startTeam}
            disabled={Boolean(launching)}
            className="mt-1 rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {launching ? `Starting ${launching}…` : "Start my team — free"}
          </button>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-[var(--muted)]">Your team</h2>
            {(data.project?.agentIds ?? []).map((name) => {
              const agent = data.agents.find((a) => a.name === name);
              const member = STARTER_TEAM.find((r) => r.role === name);
              return (
                <TeamMember
                  key={name}
                  glyph={member?.glyph ?? "✦"}
                  name={name}
                  blurb={member?.blurb ?? ""}
                  status={agent ? agentStatus(agent) : "provisioning"}
                />
              );
            })}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-[var(--muted)]">Give your team a goal</h2>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Reply to today's customer messages and tell me what I earned this week"
              rows={3}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm outline-none"
            />
            <button
              onClick={submitGoal}
              disabled={goalBusy || !goal.trim()}
              className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              {goalBusy ? "Sending…" : "Give the goal"}
            </button>
            {session && (
              <p className="text-xs text-[var(--muted)]">
                Team status: <span className="text-[var(--foreground)]">{session.status}</span>
                {session.round ? ` · round ${session.round}` : ""}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-[var(--muted)]">What they're doing</h2>
            {data.tasks.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No tasks yet — give a goal to get started.</p>
            ) : (
              data.tasks.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </section>
        </>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </main>
  );
}

function TeamMember({
  glyph,
  name,
  blurb,
  status,
}: {
  glyph: string;
  name: string;
  blurb: string;
  status: "online" | "provisioning" | "offline" | null;
}) {
  const dot =
    status === "online" ? "#4ade80" : status === "provisioning" ? "#fbbf24" : status === "offline" ? "#9ca3af" : "transparent";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span
        className="grid h-10 w-10 place-items-center rounded-full text-lg"
        style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
        aria-hidden
      >
        {glyph}
      </span>
      <div className="flex-1">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-[var(--muted)]">{blurb}</p>
      </div>
      {status && (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} aria-label={status} />
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const tone =
    task.status === "Done" ? "#4ade80" : task.status === "In progress" ? "#fbbf24" : "#9ca3af";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{task.name}</p>
        {task.agent && <p className="text-xs text-[var(--muted)]">{task.agent}</p>}
      </div>
      <span className="ml-3 shrink-0 text-xs" style={{ color: tone }}>
        {task.status}
      </span>
    </div>
  );
}
