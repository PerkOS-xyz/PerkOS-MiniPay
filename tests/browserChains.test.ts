import { describe, expect, it } from "vitest";

import {
  BROWSER_CHAIN_IDS,
  BROWSER_CHAIN_OPTIONS,
  DYNAMIC_BROWSER_NETWORKS,
  isBrowserChainId,
  robinhoodChain,
} from "../app/lib/browserChains";

describe("browser chain support", () => {
  it("offers Celo, Base, and Robinhood Chain mainnets", () => {
    expect(BROWSER_CHAIN_OPTIONS.map((chain) => chain.id)).toEqual([42220, 8453, 4663]);
  });

  it("uses the official Robinhood Chain mainnet configuration", () => {
    expect(robinhoodChain.id).toBe(4663);
    expect(robinhoodChain.nativeCurrency.symbol).toBe("ETH");
    expect(robinhoodChain.rpcUrls.default.http[0]).toContain("rpc.mainnet.chain.robinhood.com");
  });

  it("publishes every supported chain to Dynamic", () => {
    expect(DYNAMIC_BROWSER_NETWORKS.map((network) => network.chainId)).toEqual([
      BROWSER_CHAIN_IDS.celo,
      BROWSER_CHAIN_IDS.base,
      BROWSER_CHAIN_IDS.robinhood,
    ]);
  });

  it("rejects unsupported chain ids", () => {
    expect(isBrowserChainId(8453)).toBe(true);
    expect(isBrowserChainId(1)).toBe(false);
    expect(isBrowserChainId("4663")).toBe(false);
  });
});
