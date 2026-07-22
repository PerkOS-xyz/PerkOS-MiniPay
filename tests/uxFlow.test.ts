import { describe, expect, it } from "vitest";

import { creditsToUsd } from "../app/lib/credits";
import { STARTER_CHORES } from "../app/lib/starterChores";

describe("first-run workflow", () => {
  it("offers only the three launch wedges", () => {
    expect(STARTER_CHORES.map((c) => c.templateId)).toEqual([
      "merchant-daily",
      "freelance-invoice",
      "savings-group",
    ]);
  });

  it("starts every shortcut with a concrete goal", () => {
    expect(
      STARTER_CHORES.every((c) =>
        Object.values(c.copy).every((copy) => copy.goal.trim().length > 20),
      ),
    ).toBe(true);
  });

  it("has complete English, Spanish, and Portuguese shortcut copy", () => {
    for (const chore of STARTER_CHORES) {
      for (const locale of ["en", "es", "pt"] as const) {
        expect(chore.copy[locale].label).toBeTruthy();
        expect(chore.copy[locale].sub).toBeTruthy();
      }
    }
  });
});

describe("credit pricing", () => {
  it.each([
    [1, "0.02"],
    [3, "0.06"],
    [18, "0.36"],
  ])("shows %s credits as $%s", (credits, usd) => {
    expect(creditsToUsd(credits)).toBe(usd);
  });
});
