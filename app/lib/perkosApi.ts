import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { authedJson, authedFetch } from "./apiClient";

// ─── Types (subset of PerkOS-Shared-Types) ───────────────────────────────────

export type Agent = {
  id: string;
  name: string;
  runtime: "Hermes" | "OpenClaw";
  status: "provisioning" | "ready" | "failed" | "unknown";
  walletAddress: string;
  bridgeConnected?: boolean;
  lastBridgeSeenAt?: string;
  createdAt?: string;
};

export type PmSession = {
  status: "planning" | "working" | "reviewing" | "done" | "stopped";
  goal: string;
  round: number;
  taskIds: string[];
  reason?: string;
  lastRunAt?: string;
};

export type Project = {
  id: string;
  name: string;
  goal?: string;
  status: string;
  agents: number;
  tasks: number;
  orgId?: string;
  agentIds?: string[];
  pmAgent?: string | null;
  pmSession?: PmSession;
  /** Which app created it. MiniPay only ever shows surface === "minipay". */
  surface?: string;
  createdAt?: string;
};

export type Task = {
  id: string;
  name: string;
  status: "Backlog" | "In progress" | "Review" | "Done";
  priority?: "High" | "Medium" | "Low";
  agent?: string;
  prompt?: string;
  result?: string;
  updatedAt?: string;
};

export type AgentOnline = "online" | "provisioning" | "offline";

export function agentStatus(a: Agent): AgentOnline {
  if (a.status === "provisioning") return "provisioning";
  if (a.bridgeConnected) return "online";
  const lastSeen = a.lastBridgeSeenAt ? new Date(a.lastBridgeSeenAt).getTime() : 0;
  return Date.now() - lastSeen < 5 * 60_000 ? "online" : "offline";
}

const db = () => firebaseDb();

// ─── Orgs ─────────────────────────────────────────────────────────────────────

export async function ensureDefaultOrg(address: string): Promise<string> {
  const orgsCol = collection(db(), "wallets", address, "organizations");
  const snap = await getDocs(orgsCol);
  const existing = snap.docs.find((d) => d.data().isDefault) ?? snap.docs[0];
  if (existing) return existing.id;

  const ref = doc(orgsCol);
  await setDoc(ref, {
    id: ref.id,
    name: "My business",
    ownerWallet: address,
    isDefault: true,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export async function listAgents(address: string): Promise<Agent[]> {
  const snap = await getDocs(collection(db(), "wallets", address, "agents"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Agent, "id">) }));
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(address: string, orgId?: string): Promise<Project[]> {
  const snap = await getDocs(collection(db(), "wallets", address, "projects"));
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }));
  // The backend is SHARED with the main PerkOS App, so an existing user's
  // wallet already has main-app projects. MiniPay must only ever see its own —
  // otherwise Home latches onto a main-app project and the recommended
  // starter team never shows.
  const mine = all.filter((p) => p.surface === "minipay");
  return orgId ? mine.filter((p) => p.orgId === orgId) : mine;
}

export async function getProject(address: string, projectId: string): Promise<Project | null> {
  const ref = doc(db(), "wallets", address, "projects", projectId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Project, "id">) }) : null;
}

export async function createProject(
  address: string,
  input: { name: string; goal?: string; orgId: string },
): Promise<string> {
  const ref = doc(collection(db(), "wallets", address, "projects"));
  await setDoc(ref, {
    id: ref.id,
    name: input.name,
    goal: input.goal ?? "",
    status: "Active",
    agents: 0,
    tasks: 0,
    budget: "0 cUSD",
    orgId: input.orgId,
    agentIds: [],
    pmAgent: null,
    surface: "minipay",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function setProjectTeam(
  address: string,
  projectId: string,
  agentNames: string[],
  pmAgent: string,
): Promise<void> {
  await updateDoc(doc(db(), "wallets", address, "projects", projectId), {
    agentIds: agentNames,
    pmAgent,
    agents: agentNames.length,
    updatedAt: new Date().toISOString(),
  });
}

export async function listTasks(address: string, projectId: string): Promise<Task[]> {
  const snap = await getDocs(
    collection(db(), "wallets", address, "projects", projectId, "tasks"),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) }));
}

export type ActivityEvent = {
  id: string;
  actor: string;
  verb: string;
  object: string;
  detail?: string;
  projectId?: string;
  /** epoch ms (0 if unknown) — for relative-time display. */
  ts: number;
};

export async function listActivity(address: string, max = 30): Promise<ActivityEvent[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db(), "wallets", address, "activity_events"),
        orderBy("ts", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      const raw = x.ts as { toMillis?: () => number } | number | undefined;
      const ts =
        raw && typeof (raw as { toMillis?: () => number }).toMillis === "function"
          ? (raw as { toMillis: () => number }).toMillis()
          : typeof raw === "number"
            ? raw
            : 0;
      return {
        id: d.id,
        actor: typeof x.actor === "string" ? x.actor : "",
        verb: typeof x.verb === "string" ? x.verb : "",
        object: typeof x.object === "string" ? x.object : "",
        detail: typeof x.detail === "string" ? x.detail : undefined,
        projectId: typeof x.projectId === "string" ? x.projectId : undefined,
        ts,
      };
    });
  } catch {
    return [];
  }
}

// ─── HTTP: launch + PM (server-side actions) ─────────────────────────────────

export type LaunchAgentInput = {
  walletAddress: string;
  runtime: "Hermes" | "OpenClaw";
  name: string;
  soul?: string;
  skills?: string[];
  plugins?: string[];
  imageTag?: string | null;
  deployMode?: "perkos-managed";
};

export type LaunchAgentResult = {
  ok: boolean;
  launchId: string;
  result: { agent?: Agent; status?: string; jobId?: string | null };
};

export function launchAgent(input: LaunchAgentInput): Promise<LaunchAgentResult> {
  return authedJson<LaunchAgentResult>("/agents/launch", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update the goal, then kick off one PM turn (plans → assigns → dispatches).
 *  Legacy direct-run path; MiniPay now uses the propose→approve workflow gate. */
export async function giveGoal(
  address: string,
  projectId: string,
  goal: string,
): Promise<void> {
  await updateDoc(doc(db(), "wallets", address, "projects", projectId), {
    goal,
    updatedAt: new Date().toISOString(),
  });
  await authedJson(`/projects/${projectId}/pm-turn`, {
    method: "POST",
    body: JSON.stringify({ trigger: "run-button" }),
  });
}

// ─── Workflow gate (propose → estimate → approve → run) ───────────────────────

export type WorkflowTask = {
  title: string;
  complexity: "simple" | "standard" | "complex";
  weight: number;
  agent: string;
};

export type ProposeResult =
  | {
      status: "proposed";
      docId: string;
      workflowState: "proposed";
      estimateCredits: number;
      tasks: WorkflowTask[];
      chat: string;
    }
  | { status: "intake"; workflowState: "intake"; chat: string; docId: null };

/** Ask the PM to PROPOSE a plan for a goal (no execution, no charge yet). */
export async function proposeWorkflow(
  projectId: string,
  goal: string,
): Promise<ProposeResult> {
  const { data } = await authedJson<{ data: ProposeResult }>(
    "/minipay/workflow/propose",
    { method: "POST", body: JSON.stringify({ projectId, goal }) },
  );
  return data;
}

export type WorkflowView = {
  docId: string;
  workflowState: string;
  status: string;
  goal: string;
  chat: string;
  estimateCredits: number;
  tasks: WorkflowTask[];
  balance: { credits: number; freeWorkflowsLeft: number };
  freeEligible: boolean;
  canAfford: boolean;
  tooLarge: boolean;
};

export async function getWorkflow(
  projectId: string,
  docId: string,
): Promise<WorkflowView> {
  const { data } = await authedJson<{ data: WorkflowView }>(
    `/minipay/workflow/${projectId}/${docId}`,
  );
  return data;
}

export type ApproveResult =
  | {
      ok: true;
      settlement: "exempt" | "free" | "credits";
      estimateCredits: number;
      created: number;
      balanceAfter: number | null;
      freeWorkflowsLeft: number | null;
      alreadyApproved?: boolean;
    }
  | {
      ok: false;
      /** "INSUFFICIENT_CREDITS" | "WORKFLOW_TOO_LARGE" | "EMPTY_WORKFLOW" | … */
      code: string;
      need?: number;
      have?: number;
      estimateCredits?: number;
      max?: number;
    };

/** Approve a proposed workflow → charge (or free) → materialize → run.
 *  Returns the gate's structured outcome (402 INSUFFICIENT_CREDITS is a result,
 *  not a thrown error, so the UI can offer a top-up). */
export async function approveWorkflow(
  projectId: string,
  docId: string,
): Promise<ApproveResult> {
  const res = await authedFetch(`/minipay/workflow/${projectId}/${docId}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: ApproveResult;
    error?: { code?: string; need?: number; have?: number; estimateCredits?: number; max?: number };
  };
  if (res.ok && body.data) return body.data;
  const e = body.error ?? {};
  return {
    ok: false,
    code: e.code ?? "APPROVE_FAILED",
    need: e.need,
    have: e.have,
    estimateCredits: e.estimateCredits,
    max: e.max,
  };
}

// ─── Credits (MiniPay billing) ────────────────────────────────────────────────

export type BillingMe = {
  credits: number;
  freeWorkflowsLeft: number;
  freeWorkflowsPerMonth: number;
  membershipUntil: string | null;
  membershipActive: boolean;
  exempt: boolean;
  enrolled: boolean;
  creditUsd: number;
};

export async function getBillingMe(): Promise<BillingMe> {
  return authedJson<BillingMe>("/minipay/billing/me");
}

export type CreditPacks = {
  creditUsd: number;
  packs: Array<{ usd: number; credits: number }>;
  membership: { usd: number; credits: number };
};

export async function getPacks(): Promise<CreditPacks> {
  return authedJson<CreditPacks>("/minipay/billing/packs");
}

/** Verify a cUSD transfer (by tx hash) and credit the matching pack. */
export async function depositCelo(
  txHash: string,
): Promise<{ ok: boolean; credits: number; added: number; amountUsd: number }> {
  return authedJson("/minipay/billing/deposit-celo", {
    method: "POST",
    body: JSON.stringify({ txHash }),
  });
}

// ─── Per-agent chat ───────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  from: "user" | "agent";
  text: string;
  agentName?: string;
  createdAt?: string;
};

/** Write a user message into the project chat thread (agent replies land here too). */
export async function addProjectMessage(
  address: string,
  projectId: string,
  text: string,
  mentions?: string[],
): Promise<void> {
  const ref = doc(collection(db(), "wallets", address, "projects", projectId, "messages"));
  await setDoc(ref, {
    from: "user",
    text,
    ...(mentions && mentions.length ? { mentions } : {}),
    createdAt: serverTimestamp(),
  });
}

/** Dispatch a message to a specific agent over A2A; it replies into the project chat. */
export async function mentionAgent(
  projectId: string,
  agentName: string,
  text: string,
): Promise<void> {
  await authedJson(`/projects/${projectId}/mention-agent`, {
    method: "POST",
    body: JSON.stringify({ agentName, text }),
  });
}

// ─── Templates (shared-agents redesign) ──────────────────────────────────────

export type TemplateRoleRef = { agentName: string; label: string; isPM?: boolean };

export type Template = {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
  pricingBand?: "basic" | "pro";
  ring?: 1 | 2 | 3;
  roles: TemplateRoleRef[];
};

export type Activation = {
  id: string;
  wallet: string;
  templateId: string;
  projectId: string;
  convId: string;
  agentNames: string[];
  status: "active" | "closed";
};

const apiBase = process.env.NEXT_PUBLIC_PERKOS_API_URL ?? "https://api.perkos.xyz";

/** Public catalog of activatable templates (no auth). */
export async function listTemplates(): Promise<Template[]> {
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/templates`);
  if (!res.ok) throw new Error(`Failed to load templates (${res.status})`);
  const { templates } = (await res.json()) as { templates: Template[] };
  return templates;
}

/** Activate a template → instant project on the PerkOS-owned shared fleet. */
export async function activateTemplate(
  templateId: string,
): Promise<{ ok: boolean; alreadyActive: boolean; activation: Activation }> {
  return authedJson("/templates/activate", {
    method: "POST",
    body: JSON.stringify({ templateId }),
  });
}
