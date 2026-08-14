"use client";

import type { User } from "firebase/auth";

const apiBase = process.env.NEXT_PUBLIC_PERKOS_API_URL ?? "https://api.perkos.xyz";

export function activitySessionId(): string {
  const key = "perkos.activity.session.minipay";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export async function recordActivity(user: User, eventType: "login" | "session_start", walletAddress?: string) {
  try {
    const token = await user.getIdToken();
    await fetch(`${apiBase.replace(/\/$/, "")}/activity/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ surface: "minipay", eventType, sessionId: activitySessionId(), walletAddress }),
      keepalive: true,
    });
  } catch {
    // Product usage must remain available if telemetry is degraded.
  }
}
