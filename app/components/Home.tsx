"use client";

import { useCallback, useEffect, useState } from "react";
import {
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
import { useIsMiniPay } from "../lib/useIsMiniPay";
import { useLandingNav } from "../lib/landingNav";
import { useWalletSession } from "../lib/useWalletSession";
import { WalletPanel } from "./WalletPanel";
import { Brand } from "./Brand";
import { TemplateGallery } from "./TemplateGallery";
import { NeedToday } from "./NeedToday";
import { TeamThread } from "./TeamThread";
import { ServerWallet } from "./ServerWallet";
import { LanguageSelect } from "./LanguageSelect";
import { useLanguage } from "../lib/i18n";
import { AnnaAvatar } from "./AnnaAvatar";

type Loaded = {
  agents: Agent[];
  projects: Project[];
  templates: Template[];
  billing: BillingMe | null;
  activity: ActivityEvent[];
  tasksByProject: Map<string, Task[]>;
};

export function Home({ address }: { address: string }) {
  const { locale } = useLanguage();
  const copy = locale === "es"
    ? {
        loading: "Cargando…",
        teamWallet: "Wallet del negocio",
        logout: "Cerrar sesión",
        addHelper: "Agregar una capacidad",
        addHelperSub: "Dale a Anna más formas de ayudarte con dinero y clientes. Solo pagas por el trabajo.",
        back: "‹ Volver con Anna",
      }
    : locale === "pt"
      ? {
        loading: "Carregando…",
        teamWallet: "Carteira do negócio",
        logout: "Sair",
        addHelper: "Adicionar uma habilidade",
        addHelperSub: "Dê à Anna mais formas de ajudar com dinheiro e clientes. Você paga apenas pelo trabalho.",
        back: "‹ Voltar para Anna",
      }
    : {
        loading: "Loading…",
        teamWallet: "Business wallet",
        logout: "Log out",
        addHelper: "Add a skill",
        addHelperSub: "Give Anna more ways to help with money and customers. You only pay for the work.",
        back: "‹ Back to Anna",
      };
  // Logout is browser-only: inside MiniPay the wallet is the host identity
  // and connection is implicit (rule C1) — no logout affordance there.
  const isMiniPay = useIsMiniPay();
  const { logout } = useWalletSession();
  const { goToLanding } = useLandingNav();

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "gallery" | "wallet">("list");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
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
      setError(e instanceof Error ? e.message : "Couldn't load Anna");
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
        {error ?? copy.loading}
      </main>
    );
  }

  const templateFor = (p: Project): Template | undefined =>
    data.templates.find((t) => t.id === (p as Project & { templateId?: string }).templateId);
  const openProject = openProjectId
    ? data.projects.find((p) => p.id === openProjectId) ?? null
    : null;

  const header = (
    <header className="flex items-center justify-between">
      <button onClick={goToLanding} aria-label="Home" className="active:opacity-80">
        <Brand />
      </button>
      <div className="flex items-center gap-3">
        <LanguageSelect compact />
        <button
          onClick={() => setView("wallet")}
          className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
        >
          {copy.teamWallet}
        </button>
        {!isMiniPay && (
          <button
            onClick={logout}
            className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
          >
            {copy.logout}
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
        template={templateFor(openProject)}
        initialGoal={initialGoal}
        onBack={() => {
          setOpenProjectId(null);
          setInitialGoal(null);
        }}
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
          <h1 className="text-2xl font-semibold">{copy.addHelper}</h1>
          <p className="text-sm text-[var(--muted)]">{copy.addHelperSub}</p>
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
          {copy.back}
        </button>
      </main>
    );
  }

  // --- Team wallet (server wallet: address + Celo balance + deposit) -------
  if (view === "wallet") {
    return (
      <main className="flex flex-col gap-5 px-5 py-7">
        {header}
        <ServerWallet address={address} />
        <button
          onClick={() => setView("list")}
          className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
        >
          {copy.back}
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
        onRewardClaimed={load}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </main>
  );
}

// ---------------------------------------------------------------------------

function ProjectView({
  project,
  template,
  initialGoal,
  onBack,
  onAddCredits,
}: {
  project: Project;
  template: Template | undefined;
  initialGoal?: string | null;
  onBack: () => void;
  onAddCredits: () => void;
}) {
  const { locale } = useLanguage();
  const teamLabel = locale === "es"
    ? "Anna está lista para ayudarte"
    : locale === "pt"
      ? "Anna está pronta para ajudar"
      : "Anna is ready to help";
  return (
    <main className="flex h-[100dvh] flex-col px-5 pb-3 pt-4">
      <header className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="-ml-1 px-1 text-2xl leading-none">
          ‹
        </button>
        <AnnaAvatar size="sm" state="resting" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{template?.name ?? project.name}</h1>
          <p className="truncate text-xs text-[var(--muted)]">
            {teamLabel}
          </p>
        </div>
        <LanguageSelect compact />
      </header>

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <TeamThread projectId={project.id} initialGoal={initialGoal} onAddCredits={onAddCredits} />
      </div>
    </main>
  );
}
