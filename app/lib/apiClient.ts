import { firebaseAuth } from "./firebase";

// Authenticated calls to PerkOS-API (api.perkos.xyz). Attaches the Firebase ID token as a
// Bearer; PerkOS-API's requireAuth middleware verifies it and scopes to the caller's wallet.

const apiBase = process.env.NEXT_PUBLIC_PERKOS_API_URL ?? "https://api.perkos.xyz";

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in. Connect your wallet first.");
  const token = await user.getIdToken();

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const url = apiBase.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`);
  return fetch(url, { ...init, headers });
}

export async function authedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authedFetch(path, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body?.error ?? `${init.method ?? "GET"} ${path} failed (${res.status})`);
  }
  return body as T;
}
