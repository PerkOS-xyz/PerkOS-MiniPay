"use client";

import { AnnaAvatar } from "./AnnaAvatar";
import { Brand } from "./Brand";
import { LanguageSelect } from "./LanguageSelect";
import { QuickActions } from "./QuickActions";
import { useLanguage } from "../lib/i18n";

/** First-run entry: recognizable jobs, not templates, agents, or workflows. */
export function NeedToday({ onExplore }: { onExplore: () => void }) {
  const { locale } = useLanguage();
  const copy = locale === "es"
    ? {
        title: "Hola, soy Anna",
        subtitle: "Te ayudo a escribir, responder y organizar lo de cada día. No necesitas saber usar IA.",
        profiles: "Ayuda para mi trabajo",
        profilesSub: "Configura Anna para una tienda, restaurante, secretaría o negocio de servicios.",
      }
    : locale === "pt"
      ? {
          title: "Olá, eu sou Anna",
          subtitle: "Ajudo você a escrever, responder e organizar as tarefas do dia. Você não precisa saber usar IA.",
          profiles: "Ajuda para o meu trabalho",
          profilesSub: "Configure Anna para uma loja, restaurante, secretaria ou negócio de serviços.",
        }
      : {
          title: "Hi, I'm Anna",
          subtitle: "I help you write, reply, and organize everyday work. You don't need to know how to use AI.",
          profiles: "Help for my kind of work",
          profilesSub: "Set up Anna for a shop, restaurant, office, or service business.",
        };

  return (
    <main className="flex min-h-[100dvh] flex-col gap-5 px-5 py-7">
      <header className="flex items-center justify-between">
        <Brand />
        <LanguageSelect compact />
      </header>

      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <AnnaAvatar size="lg" state="welcome" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{copy.subtitle}</p>
        </div>
      </div>

      <QuickActions />

      <button
        type="button"
        onClick={onExplore}
        className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-left active:bg-white/5"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lg" aria-hidden>
          +
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{copy.profiles}</span>
          <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{copy.profilesSub}</span>
        </span>
        <span className="text-lg text-[var(--muted)]" aria-hidden>›</span>
      </button>
    </main>
  );
}
