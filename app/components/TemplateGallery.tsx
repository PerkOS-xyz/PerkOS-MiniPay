"use client";

import { useEffect, useState } from "react";
import { activateTemplate, listTemplates, type Template } from "../lib/perkosApi";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  glyphFor,
  type CategoryKey,
} from "../lib/templateMeta";

/**
 * The template gallery — the entry point of the shared-agents model. Templates
 * are PerkOS-owned; "Use this" activates one (creates the user's project on
 * the shared fleet, instant) and calls back with the new project id.
 */
export function TemplateGallery({
  activeTemplateIds,
  onActivated,
}: {
  activeTemplateIds: Set<string>;
  onActivated: (projectId: string) => void;
}) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load tools"));
  }, []);

  async function use(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await activateTemplate(id);
      onActivated(res.activation.projectId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't set that up";
      setError(/FLEET/i.test(msg) ? "This tool is coming online soon — check back shortly." : msg);
    } finally {
      setBusy(null);
    }
  }

  if (error && !templates) {
    return <p className="text-xs text-red-300">{error}</p>;
  }
  if (!templates) {
    return <p className="text-sm text-[var(--muted)]">Loading tools…</p>;
  }

  const byCat = new Map<CategoryKey, Template[]>();
  for (const t of templates) {
    const cat = (t.category as CategoryKey) ?? "everyday";
    (byCat.get(cat) ?? byCat.set(cat, []).get(cat)!).push(t);
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-xs text-red-300">{error}</p>}
      {CATEGORY_ORDER.filter((c) => byCat.has(c)).map((cat) => (
        <section key={cat} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">{CATEGORY_LABELS[cat]}</h2>
          {byCat.get(cat)!.map((t) => {
            const active = activeTemplateIds.has(t.id);
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
                  aria-hidden
                >
                  {glyphFor(t.id)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-[var(--muted)]">{t.tagline}</p>
                </div>
                <button
                  onClick={() => !active && use(t.id)}
                  disabled={active || busy !== null}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-white/10 text-[var(--muted)]"
                      : "bg-[var(--accent)] text-white disabled:opacity-50"
                  }`}
                >
                  {active ? "Added" : busy === t.id ? "Adding…" : "Use"}
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
