import { BROWSER_CHAIN_IDS, type BrowserChainId } from "./browserChains";

export type BrowserPaymentNetwork = "base" | "robinhood";

export type BrowserPaymentRail = {
  network: BrowserPaymentNetwork;
  chainId: BrowserChainId;
  chainLabel: string;
  token: {
    address: `0x${string}`;
    symbol: "USDC" | "USDG";
    decimals: 6;
  };
  explorerUrl: string;
};

export const BROWSER_PAYMENT_RAILS: Record<BrowserPaymentNetwork, BrowserPaymentRail> = {
  base: {
    network: "base",
    chainId: BROWSER_CHAIN_IDS.base,
    chainLabel: "Base",
    token: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      decimals: 6,
    },
    explorerUrl: "https://base.blockscout.com",
  },
  robinhood: {
    network: "robinhood",
    chainId: BROWSER_CHAIN_IDS.robinhood,
    chainLabel: "Robinhood Chain",
    token: {
      address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      symbol: "USDG",
      decimals: 6,
    },
    explorerUrl: "https://robinhoodchain.blockscout.com",
  },
};

export function browserPaymentRail(chainId: number): BrowserPaymentRail | null {
  if (chainId === BROWSER_CHAIN_IDS.base) return BROWSER_PAYMENT_RAILS.base;
  if (chainId === BROWSER_CHAIN_IDS.robinhood) return BROWSER_PAYMENT_RAILS.robinhood;
  return null;
}
