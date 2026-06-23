import { createConfig, http } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// PerkOS-MiniPay is Celo-only (MiniPay rule C3 — no other networks).
// MiniPay presents an injected EIP-1193 provider, so a single `injected` connector is all we need;
// connection is implicit inside the wallet (see AutoConnect — we never render a connect button, C1).

const celoRpc = process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org";

export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [celo.id]: http(celoRpc),
    [celoSepolia.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
