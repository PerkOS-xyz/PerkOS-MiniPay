import { describe, it, expect } from "vitest";

import {
  BASIC_AGENTS,
  TEMPLATE_CATALOG,
  basicById,
  templateById,
} from "../app/lib/templateCatalog";

describe("template catalog (15 basics composed by templates)", () => {
  it("every template composes at least one basic, and all basicIds resolve", () => {
    for (const t of TEMPLATE_CATALOG) {
      expect(t.basicIds.length, `template ${t.id} has no basics`).toBeGreaterThan(0);
      for (const id of t.basicIds) {
        expect(basicById(id), `template ${t.id} → unknown basic "${id}"`).toBeDefined();
      }
    }
  });

  it("template ids and basic ids are unique", () => {
    const tIds = TEMPLATE_CATALOG.map((t) => t.id);
    expect(new Set(tIds).size).toBe(tIds.length);
    const bIds = BASIC_AGENTS.map((b) => b.id);
    expect(new Set(bIds).size).toBe(bIds.length);
  });

  it("basic ids are valid relay identities (^[a-zA-Z0-9_-]{2,32}$)", () => {
    for (const b of BASIC_AGENTS) expect(b.id).toMatch(/^[a-zA-Z0-9_-]{2,32}$/);
  });

  it("basicById / templateById resolve and miss correctly", () => {
    expect(basicById(BASIC_AGENTS[0].id)?.id).toBe(BASIC_AGENTS[0].id);
    expect(basicById("does-not-exist")).toBeUndefined();
    expect(templateById(TEMPLATE_CATALOG[0].id)?.id).toBe(TEMPLATE_CATALOG[0].id);
    expect(templateById("does-not-exist")).toBeUndefined();
  });

  it("every template has a name, tagline, category and pricing band", () => {
    for (const t of TEMPLATE_CATALOG) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.tagline.length).toBeGreaterThan(0);
      expect(t.category.length).toBeGreaterThan(0);
      expect(["basic", "pro"]).toContain(t.pricingBand);
    }
  });

  it("publishes only everyday communication profiles, not collection or finance products", () => {
    expect(TEMPLATE_CATALOG).toHaveLength(8);
    expect(TEMPLATE_CATALOG.some((template) => template.basicIds.includes("assistant"))).toBe(true);
    const publicCopy = TEMPLATE_CATALOG
      .map((template) => `${template.id} ${template.name} ${template.tagline}`)
      .join(" ")
      .toLowerCase();
    for (const forbidden of [
      "debt",
      "loan",
      "lending",
      "rent collector",
      "yield",
      "remittance",
      "chase",
      "who owes",
    ]) {
      expect(publicCopy).not.toContain(forbidden);
    }
  });
});
