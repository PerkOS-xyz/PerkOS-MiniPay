import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BrowserChainSelect } from "../app/components/BrowserChainSelect";
import { LanguageSelect } from "../app/components/LanguageSelect";
import { BrowserChainContext } from "../app/lib/browserChainContext";
import { LanguageProvider } from "../app/lib/i18n";

describe("browser-only chain selector", () => {
  it("renders nothing without the Dynamic browser provider", () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <BrowserChainSelect compact />
      </LanguageProvider>,
    );
    expect(html).toBe("");
  });

  it("appears beside the language selector in the browser provider", () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <BrowserChainContext.Provider
          value={{ chainId: 8453, switching: false, error: null, switchChain: vi.fn() }}
        >
          <LanguageSelect compact />
        </BrowserChainContext.Provider>
      </LanguageProvider>,
    );
    expect(html).toContain("Base");
    expect(html).toContain("RHC");
    expect(html).toContain("PT");
  });
});
