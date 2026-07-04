// The 20 MiniPay-community template catalog (source: Obsidian
// PerkOS-MiniPay-20-Use-Cases.md, Julio 2026-07-03).
//
// ARCHITECTURE NOTE — shared agents: these templates are NOT user-deployed.
// The roles below run as PerkOS-owned shared agents (multi-agent profiles on
// a PerkOS fleet + per-user rental grants; see the shared-agents redesign doc
// in the vault). "Activating" a template creates a project + grants — no
// provisioning, no image tags, instant. The catalog is therefore pure data
// here; the fleet mapping lives in PerkOS-API.
//
// v1 souls are ALL NON-CUSTODIAL: agents track, remind, draft, and prepare —
// the owner makes every payment themselves in MiniPay. `ring` records each
// template's upgrade path, not a gate on shipping the soul:
//   1 = fully served by chat+tracking today
//   2 = gains on-chain payment-confirmation once the Celo watcher (P1) lands
//   3 = has a future execution/custody upgrade (user-signed prepared txs or
//       regulated rails) — gated on explicit approval, NOT part of v1.

import type { SoulFields } from "./souls";
import { TEMPLATE_CATALOG } from "./templateCatalogData";

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

export type TemplateRole = {
  /** Machine name — shared-agent identity, ^[a-zA-Z0-9_-]{2,32}$, unique across the catalog. */
  name: string;
  label: string;
  glyph: string;
  blurb: string;
  isPM?: boolean;
  soul: SoulFields;
};

export type MiniPayTemplate = {
  id: string;
  name: string;
  tagline: string;
  category: TemplateCategory;
  /** ISO country hints for merchandising ("ALL" = every MiniPay market). */
  countries: string[];
  pricingBand: PricingBand;
  /** Capability ring / upgrade path — see header note. */
  ring: 1 | 2 | 3;
  roles: TemplateRole[];
};

export { TEMPLATE_CATALOG };

export function templateById(id: string): MiniPayTemplate | undefined {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): MiniPayTemplate[] {
  return TEMPLATE_CATALOG.filter((t) => t.category === category);
}
