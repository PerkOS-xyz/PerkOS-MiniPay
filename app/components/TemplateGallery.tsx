"use client";

import { useCallback, useEffect, useState } from "react";
import { activateTemplate, listTemplates, type Template } from "../lib/perkosApi";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  glyphFor,
  type CategoryKey,
} from "../lib/templateMeta";
import { translated, useLanguage } from "../lib/i18n";

const CATEGORY_LABELS_ES: Record<CategoryKey, string> = {
  merchant: "Mi negocio",
  everyday: "Dinero diario",
  remittances: "Familia y remesas",
  "savings-groups": "Ahorro y grupos",
  "informal-finance": "Renta y préstamos",
};

const CATEGORY_LABELS_PT: Record<CategoryKey, string> = {
  merchant: "Meu negócio",
  everyday: "Dinheiro do dia a dia",
  remittances: "Família e remessas",
  "savings-groups": "Poupança e grupos",
  "informal-finance": "Aluguel e empréstimos",
};

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
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadTemplates = useCallback(() => {
    setError(null);
    setTemplates(null);
    listTemplates()
      .then(setTemplates)
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
          <h2 className="text-sm font-medium text-[var(--muted)]">
            {locale === "es" ? CATEGORY_LABELS_ES[cat] : locale === "pt" ? CATEGORY_LABELS_PT[cat] : CATEGORY_LABELS[cat]}
          </h2>
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
