import { describe, expect, it } from "vitest";

import { creditsToUsd } from "../app/lib/credits";
import { STARTER_ACTIONS } from "../app/lib/starterChores";

describe("first-run workflow", () => {
  it("starts with six recognizable writing jobs", () => {
    expect(STARTER_ACTIONS.map((action) => action.id)).toEqual([
      "fix-text",
      "customer-reply",
      "social-post",
      "change-tone",
      "translate",
      "summarize",
    ]);
  });

  it("gives every action a concrete instruction and input hint", () => {
    expect(
      STARTER_ACTIONS.every((action) =>
        Object.values(action.copy).every(
          (copy) => copy.instruction.trim().length > 20 && copy.placeholder.trim().length > 10,
        ),
      ),
    ).toBe(true);
  });

  it("has complete English, Spanish, and Portuguese action copy", () => {
    for (const action of STARTER_ACTIONS) {
      for (const locale of ["en", "es", "pt"] as const) {
        expect(action.copy[locale].label).toBeTruthy();
        expect(action.copy[locale].sub).toBeTruthy();
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
