import type { EvmNetwork } from "@dynamic-labs/sdk-react-core";
import { defineChain } from "viem";

export const BROWSER_CHAIN_IDS = {
  celo: 42220,
  base: 8453,
  robinhood: 4663,
} as const;

export type BrowserChainId = (typeof BROWSER_CHAIN_IDS)[keyof typeof BROWSER_CHAIN_IDS];

export const robinhoodChain = defineChain({
  id: BROWSER_CHAIN_IDS.robinhood,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Robinhood Chain Explorer", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const BROWSER_CHAIN_OPTIONS: ReadonlyArray<{
  id: BrowserChainId;
  label: string;
  shortLabel: string;
}> = [
  { id: BROWSER_CHAIN_IDS.celo, label: "Celo", shortLabel: "Celo" },
  { id: BROWSER_CHAIN_IDS.base, label: "Base", shortLabel: "Base" },
  { id: BROWSER_CHAIN_IDS.robinhood, label: "Robinhood Chain", shortLabel: "RHC" },
];

export function isBrowserChainId(value: unknown): value is BrowserChainId {
  return typeof value === "number" && BROWSER_CHAIN_OPTIONS.some((chain) => chain.id === value);
}

const nativeEth = { name: "Ether", symbol: "ETH", decimals: 18 };

export const DYNAMIC_BROWSER_NETWORKS: EvmNetwork[] = [
  {
    chainId: BROWSER_CHAIN_IDS.celo,
    networkId: BROWSER_CHAIN_IDS.celo,
    name: "Celo",
    vanityName: "Celo",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
    rpcUrls: [process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"],
    blockExplorerUrls: ["https://celoscan.io"],
    iconUrls: [],
  },
  {
    chainId: BROWSER_CHAIN_IDS.base,
    networkId: BROWSER_CHAIN_IDS.base,
    name: "Base",
    vanityName: "Base",
    nativeCurrency: nativeEth,
    rpcUrls: [process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"],
    blockExplorerUrls: ["https://base.blockscout.com"],
    iconUrls: [],
  },
  {
    chainId: BROWSER_CHAIN_IDS.robinhood,
    networkId: BROWSER_CHAIN_IDS.robinhood,
    name: "Robinhood Chain",
    vanityName: "Robinhood Chain",
    nativeCurrency: nativeEth,
    rpcUrls: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
    iconUrls: [],
  },
];
