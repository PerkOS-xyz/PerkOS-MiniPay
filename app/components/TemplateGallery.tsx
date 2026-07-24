"use client";

import { useCallback, useEffect, useState } from "react";
import { activateTemplate, listTemplates, type Template } from "../lib/perkosApi";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  glyphFor,
  isEverydayTemplate,
  localizedTemplate,
  type CategoryKey,
} from "../lib/templateMeta";
import { translated, useLanguage } from "../lib/i18n";

/**
 * Optional work profiles. The shared-agent machinery stays invisible: people
 * choose the kind of work they do, never an agent or deployment.
 */
export function TemplateGallery({
  activeTemplateIds,
  onActivated,
}: {
  activeTemplateIds: Set<string>;
  onActivated: (projectId: string) => void;
}) {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadTemplates = useCallback(() => {
    setError(null);
    setTemplates(null);
    listTemplates()
      .then((items) => setTemplates(items.filter((item) => isEverydayTemplate(item.id))))
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : tr("Couldn't load tools", "No se pudieron cargar las herramientas", "Não foi possível carregar as ferramentas"),
        ),
      );
  }, [locale]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function use(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await activateTemplate(id);
      onActivated(res.activation.projectId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr("Couldn't set that up", "No se pudo configurar", "Não foi possível configurar");
      setError(/FLEET/i.test(msg) ? tr("This tool is coming online soon. Check back shortly.", "Esta herramienta estará disponible pronto. Vuelve en unos minutos.", "Esta ferramenta estará disponível em breve. Volte em alguns minutos.") : msg);
    } finally {
      setBusy(null);
    }
  }

  if (error && !templates) {
    return (
      <div className="rounded-2xl border border-red-300/20 bg-red-400/5 p-4">
        <p className="text-sm text-red-200">
          {tr("We couldn't load the tools.", "No pudimos cargar las herramientas.", "Não conseguimos carregar as ferramentas.")}
        </p>
        <p className="mt-1 text-xs text-foreground/60">{error}</p>
        <button
          type="button"
          onClick={loadTemplates}
          className="mt-3 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium"
        >
          {tr("Try again", "Reintentar", "Tentar novamente")}
        </button>
      </div>
    );
  }
  if (!templates) {
    return <p className="text-sm text-[var(--muted)]">{tr("Loading tools…", "Cargando herramientas…", "Carregando ferramentas…")}</p>;
  }
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
        {tr(
          "The new work profiles are being prepared. Quick actions are ready to use now.",
          "Estamos preparando los nuevos perfiles. Las acciones rápidas ya están disponibles.",
          "Estamos preparando os novos perfis. As ações rápidas já estão disponíveis.",
        )}
      </div>
    );
  }

  const byCat = new Map<CategoryKey, Template[]>();
  for (const t of templates) {
    const cat = (t.category as CategoryKey) ?? "writing";
    (byCat.get(cat) ?? byCat.set(cat, []).get(cat)!).push(t);
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-xs text-red-300">{error}</p>}
      {CATEGORY_ORDER.filter((c) => byCat.has(c)).map((cat) => (
        <section key={cat} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            {CATEGORY_LABELS[cat][locale]}
          </h2>
          {byCat.get(cat)!.map((t) => {
            const active = activeTemplateIds.has(t.id);
            const copy = localizedTemplate(t.id, locale, t);
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
                  <p className="font-medium">{copy.name}</p>
                  <p className="text-xs leading-relaxed text-[var(--muted)]">{copy.tagline}</p>
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
                  {active
                    ? tr("Added", "Agregado", "Adicionado")
                    : busy === t.id
                      ? tr("Adding…", "Agregando…", "Adicionando…")
                      : tr("Use", "Usar", "Usar")}
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
