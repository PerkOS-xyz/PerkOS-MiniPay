import { describe, it, expect } from "vitest";
import { isAddress } from "viem";

import { CUSD, USDC, USDT } from "../app/lib/tokenAddresses";

describe("Celo stablecoin config", () => {
  it("decimals: cUSD=18, USDC/USDT=6 (the decimals trap)", () => {
    expect(CUSD.decimals).toBe(18);
    expect(USDC.decimals).toBe(6);
    expect(USDT.decimals).toBe(6);
  });

  it("every token has a valid address + fee adapter", () => {
    for (const t of [CUSD, USDC, USDT]) {
      expect(isAddress(t.address)).toBe(true);
      expect(isAddress(t.feeAdapter)).toBe(true);
    }
  });

  it("cUSD is its own fee currency; USDC/USDT gas goes through an ADAPTER (adapter != token)", () => {
    expect(CUSD.feeAdapter.toLowerCase()).toBe(CUSD.address.toLowerCase());
    expect(USDC.feeAdapter.toLowerCase()).not.toBe(USDC.address.toLowerCase());
    expect(USDT.feeAdapter.toLowerCase()).not.toBe(USDT.address.toLowerCase());
  });

  it("symbols are distinct", () => {
    const syms = [CUSD.symbol, USDC.symbol, USDT.symbol];
    expect(new Set(syms).size).toBe(3);
  });
});
