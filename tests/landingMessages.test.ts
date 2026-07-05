import { describe, it, expect, beforeEach } from "vitest";

import { MESSAGES, LOCALES, detectLocale } from "../app/lib/landingMessages";

// Recursively collect the dotted key paths of an object (arrays terminate).
function keyPaths(o: unknown, prefix = ""): string[] {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("landing copy", () => {
  it("en and es have identical structure (no missing translations)", () => {
    expect(keyPaths(MESSAGES.en).sort()).toEqual(keyPaths(MESSAGES.es).sort());
  });

  it("both locales feature 6 templates", () => {
    for (const l of LOCALES) expect(MESSAGES[l].templates.items).toHaveLength(6);
  });

  it("no em-dashes anywhere (copy rule)", () => {
    expect(JSON.stringify(MESSAGES)).not.toContain("—");
  });

  it("hero has a headline + CTAs in every locale", () => {
    for (const l of LOCALES) {
      expect(MESSAGES[l].hero.headline.length).toBeGreaterThan(0);
      expect(MESSAGES[l].hero.ctaPrimary.length).toBeGreaterThan(0);
      expect(MESSAGES[l].hero.enterApp.length).toBeGreaterThan(0);
    }
  });
});

describe("detectLocale", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("defaults to en", () => {
    expect(detectLocale()).toBe("en");
  });

  it("?lang=es takes priority", () => {
    window.history.replaceState({}, "", "/?lang=es");
    expect(detectLocale()).toBe("es");
  });

  it("falls back to a saved localStorage choice", () => {
    window.localStorage.setItem("perkos_lang", "es");
    expect(detectLocale()).toBe("es");
  });

  it("uses navigator language when nothing else is set", () => {
    Object.defineProperty(navigator, "language", { value: "es-MX", configurable: true });
    expect(detectLocale()).toBe("es");
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    expect(detectLocale()).toBe("en");
  });
});
