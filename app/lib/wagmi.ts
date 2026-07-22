import { createConfig, http } from "wagmi";
import { base, celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { robinhoodChain } from "./browserChains";

// MiniPay itself remains Celo-only (rule C3). The regular browser host also
// exposes Base and Robinhood Chain through Dynamic and the browser-only chain
// selector. MiniPay presents an injected EIP-1193 provider, so a single
// `injected` connector remains sufficient for its implicit connection.

const celoRpc = process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org";

export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia, base, robinhoodChain],
  // Per the MiniPay docs: plain `injected()` (no target). MiniPay's provider sets `isMiniPay`
  // but NOT `isMetaMask`, so a `target: "metaMask"` connector never matches it.
  connectors: [injected()],
  transports: {
    [celo.id]: http(celoRpc),
    [celoSepolia.id]: http(),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
    [robinhoodChain.id]: http(process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
