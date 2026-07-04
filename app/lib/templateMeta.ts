// Presentation metadata for the template gallery. The souls + role machinery
// live server-side (PerkOS-API /templates); this is purely how the catalog is
// merchandised in the MiniPay UI: category labels/order and a glyph per
// template id (the server registry doesn't carry glyphs).

export type CategoryKey =
  | "remittances"
  | "savings-groups"
  | "merchant"
  | "everyday"
  | "informal-finance";

export const CATEGORY_ORDER: CategoryKey[] = [
  "merchant",
  "everyday",
  "remittances",
  "savings-groups",
  "informal-finance",
];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  merchant: "My business",
  everyday: "Everyday money",
  remittances: "Family & remittances",
  "savings-groups": "Savings & groups",
  "informal-finance": "Rent & lending",
};

/** Abstract glyph per template id (never robot/face imagery). */
export const TEMPLATE_GLYPH: Record<string, string> = {
  "remit-family": "✦",
  "savings-group": "◆",
  "merchant-daily": "⬢",
  "bill-pay": "●",
  "airtime-data": "✧",
  "group-expense": "◆",
  "yield-mover": "◇",
  "freelance-invoice": "✦",
  "micro-credit": "⬢",
  "cross-border-trade": "◈",
  "school-fees": "✦",
  "market-trader": "♥",
  "diaspora-support": "◆",
  "savings-goal": "●",
  "rent-collector": "⬢",
  "cooperative-finance": "◆",
  "momo-bridge": "⬡",
  "event-contributions": "✦",
  "import-tracker": "▲",
  "community-welfare": "●",
};

export function glyphFor(templateId: string): string {
  return TEMPLATE_GLYPH[templateId] ?? "✦";
}
