import type { Locale } from "./landingMessages";

export type StarterChore = {
  key: string;
  glyph: string;
  templateId: string;
  copy: Record<Locale, { label: string; sub: string; goal: string }>;
};

// Keep first-run choices intentionally narrow. Each choice includes an opening
// goal so one tap starts a useful conversation instead of only creating a tool.
export const STARTER_CHORES: StarterChore[] = [
  {
    key: "sales",
    glyph: "⬢",
    templateId: "merchant-daily",
    copy: {
      en: {
        label: "Record today's sales",
        sub: "Track sales and see what you earned",
        goal: "Help me record today's sales and calculate what I earned.",
      },
      es: {
        label: "Registrar las ventas de hoy",
        sub: "Anota las ventas y calcula lo ganado",
        goal: "Ayúdame a registrar las ventas de hoy y calcular cuánto gané.",
      },
      pt: {
        label: "Registrar as vendas de hoje",
        sub: "Anote as vendas e calcule quanto ganhou",
        goal: "Ajude-me a registrar as vendas de hoje e calcular quanto ganhei.",
      },
    },
  },
  {
    key: "invoice",
    glyph: "✦",
    templateId: "freelance-invoice",
    copy: {
      en: {
        label: "Create or chase an invoice",
        sub: "Prepare an invoice or payment reminder",
        goal: "Help me create an invoice or follow up on an unpaid one.",
      },
      es: {
        label: "Crear o cobrar una factura",
        sub: "Prepara una factura o recordatorio de pago",
        goal: "Ayúdame a crear una factura o dar seguimiento a una que no han pagado.",
      },
      pt: {
        label: "Criar ou cobrar uma fatura",
        sub: "Prepare uma fatura ou lembrete de pagamento",
        goal: "Ajude-me a criar uma fatura ou acompanhar uma que ainda não foi paga.",
      },
    },
  },
  {
    key: "savings",
    glyph: "◈",
    templateId: "savings-group",
    copy: {
      en: {
        label: "Update my savings group",
        sub: "Record contributions and who still owes",
        goal: "Help me update my savings group contributions and identify who still owes.",
      },
      es: {
        label: "Actualizar mi grupo de ahorro",
        sub: "Registra aportes y quién todavía debe",
        goal: "Ayúdame a actualizar los aportes de mi grupo de ahorro e identificar quién todavía debe.",
      },
      pt: {
        label: "Atualizar meu grupo de poupança",
        sub: "Registre contribuições e quem ainda deve",
        goal: "Ajude-me a atualizar as contribuições do meu grupo de poupança e identificar quem ainda deve.",
      },
    },
  },
];
