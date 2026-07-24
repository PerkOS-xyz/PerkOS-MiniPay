"use client";

import { LanguageSelect } from "../components/LanguageSelect";
import { QuickActions } from "../components/QuickActions";
import type { QuickActionResult } from "../lib/perkosApi";
import type { QuickActionId } from "../lib/starterChores";

const RESULTS: Record<"en" | "es" | "pt", string> = {
  en: "Hello! Thank you for writing. We will have your order ready tomorrow afternoon.",
  es: "¡Hola! Gracias por escribirnos. Tendremos tu pedido listo mañana por la tarde.",
  pt: "Olá! Obrigado por escrever. Teremos seu pedido pronto amanhã à tarde.",
};

async function previewRunner(input: {
  action: QuickActionId;
  text: string;
  locale: "en" | "es" | "pt";
  requestId: string;
}): Promise<QuickActionResult> {
  return {
    ok: true,
    action: input.action,
    result: RESULTS[input.locale],
    costCredits: 1,
    settlement: "free",
    balanceAfter: 0,
    freeWorkflowsLeft: 2,
  };
}

export function E2EPreview() {
  return (
    <main className="min-h-[100dvh] px-4 pb-10 pt-4">
      <div className="mb-5 flex justify-end">
        <LanguageSelect compact />
      </div>
      <QuickActions runner={previewRunner} />
    </main>
  );
}
