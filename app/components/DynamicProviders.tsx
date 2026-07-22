"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { DynamicContextProvider, mergeNetworks } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

import { wagmiConfig } from "../lib/wagmi";
import { DYNAMIC_ENV_ID } from "../lib/dynamicBrowser";
import { AutoConnect } from "./AutoConnect";
import { DynamicWalletBridge } from "./DynamicWalletBridge";
import { BrowserChainProvider } from "./BrowserChainProvider";
import { DYNAMIC_BROWSER_NETWORKS } from "../lib/browserChains";

const mergeBrowserNetworks = (networks: Parameters<typeof mergeNetworks>[1]) =>
  mergeNetworks(DYNAMIC_BROWSER_NETWORKS, networks);

/**
 * Full provider stack WITH Dynamic, kept in its own module so providers.tsx
 * can pull it via `next/dynamic` — the @dynamic-labs SDK code-splits into an
 * async chunk that only the browser host downloads (never the MiniPay webview).
 *
 * Bridgeless (same as the main PerkOS App): DynamicContextProvider is
 * outermost; we do NOT use @dynamic-labs/wagmi-connector (drops the connection
 * on wagmi v3). DynamicWalletBridge publishes Dynamic's wallet straight to
 * useWalletSession. AutoConnect is not mounted here — it only acts inside
 * MiniPay, which never renders this tree.
 */
export default function DynamicProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <DynamicContextProvider
      settings={{
        // Same environment id as the main PerkOS App (shared Dynamic dashboard).
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          evmNetworks: mergeBrowserNetworks,
        },
        // Connect the wallet only — PerkOS does its own nonce sign-in
        // (/api/auth/wallet-signin); Dynamic's built-in SIWE would make the
        // user sign twice.
        initialAuthenticationMode: "connect-only",
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {/* Safety net for a late MiniPay provider injection: if this tree
              was mounted because the host mis-resolved to "browser", AutoConnect
              still connects the injected wagmi wallet (it only acts when
              window.ethereum.isMiniPay) and useWalletSession's wagmi fallback
              takes over. Inert in real browsers. */}
          <AutoConnect />
          <BrowserChainProvider>
            <DynamicWalletBridge>{children}</DynamicWalletBridge>
          </BrowserChainProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
