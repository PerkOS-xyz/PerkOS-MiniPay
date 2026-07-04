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
import { authedJson } from "./apiClient";

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

export async function listActivity(
  address: string,
  max = 30,
): Promise<{ id: string; actor: string; verb: string; object: string; detail?: string }[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db(), "wallets", address, "activity_events"),
        orderBy("ts", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, string>) })) as never;
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

/** Update the goal, then kick off one PM turn (plans → assigns → dispatches). */
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
