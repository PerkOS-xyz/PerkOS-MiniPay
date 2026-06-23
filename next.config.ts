import type { NextConfig } from "next";

// The `wagmi/connectors` barrel pulls in every connector (MetaMask, Coinbase, WalletConnect, Safe,
// Porto, @wagmi/core "tempo"). Each does a guarded *dynamic* `import('optional-dep')`. We only use the
// `injected` connector, so none of these run — but webpack still tries to statically resolve them and
// hard-fails. Stub them to an empty module. (Turbopack tolerates these natively, which is why the
// Next 16 PerkOS app builds without this.)
const OPTIONAL_CONNECTOR_DEPS = [
  "accounts",
  "porto",
  "@metamask/connect-evm",
  "@base-org/account",
  "@coinbase/wallet-sdk",
  "@safe-global/safe-apps-provider",
  "@safe-global/safe-apps-sdk",
  "@walletconnect/ethereum-provider",
  "pino-pretty",
];

const nextConfig: NextConfig = {
  // Standalone output keeps the deploy image small (matches the PerkOS deploy pattern).
  output: "standalone",
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      ...Object.fromEntries(OPTIONAL_CONNECTOR_DEPS.map((d) => [d, false])),
    };
    return config;
  },
};

export default nextConfig;
