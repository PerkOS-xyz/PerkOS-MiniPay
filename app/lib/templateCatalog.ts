// The MiniPay catalog: 15 reusable BASIC agents composed by 20 templates.
// Source: the 20-use-cases doc + the 15-basics redesign (Julio, 2026-07-03).
//
// ARCHITECTURE — shared agents: templates are NOT user-deployed. Each BASIC
// agent runs once as a PerkOS-owned shared Hermes agent on the fleet; a
// template is just a curated COMPOSITION of basic ids. "Activating" a template
// creates the user's project pointing at those shared basics — no provisioning,
// instant. This data is presentation + composition only; the fleet + activation
// live in PerkOS-API.
//
// v1 souls are ALL NON-CUSTODIAL: agents track, remind, draft, prepare — the
// owner makes every payment in MiniPay. `ring` records a template's upgrade
// path (1 chat-complete · 2 gains the Celo payment watcher · 3 future
// user-signed execution), not a gate on shipping.

import type { SoulFields } from "./souls";
import { BASIC_AGENTS, TEMPLATE_CATALOG } from "./templateCatalogData";

export type TemplateCategory =
  | "remittances"
  | "savings-groups"
  | "merchant"
  | "everyday"
  | "informal-finance";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  remittances: "Remittances & family",
  "savings-groups": "Savings & groups",
  merchant: "My business",
  everyday: "Everyday money",
  "informal-finance": "Lending & rent",
};

/** Per-task price band (NOT a subscription tier — pay-as-you-go stays). */
export type PricingBand = "basic" | "pro";

/** A reusable capability primitive — one shared Hermes agent on the fleet. */
export type BasicAgent = {
  /** Machine name = the shared-agent relay identity, ^[a-zA-Z0-9_-]{2,32}$. */
  id: string;
  name: string;
  label: string;
  glyph: string;
  blurb: string;
  soul: SoulFields;
};

/** A product template = a curated set of basic agent ids. */
export type MiniPayTemplate = {
  id: string;
  name: string;
  tagline: string;
  category: TemplateCategory;
  pricingBand: PricingBand;
  ring: 1 | 2 | 3;
  /** The basic agents this template composes (order = display; [0] is lead). */
  basicIds: string[];
};

export { BASIC_AGENTS, TEMPLATE_CATALOG };

export function basicById(id: string): BasicAgent | undefined {
  return BASIC_AGENTS.find((b) => b.id === id);
}

export function templateById(id: string): MiniPayTemplate | undefined {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): MiniPayTemplate[] {
  return TEMPLATE_CATALOG.filter((t) => t.category === category);
}
