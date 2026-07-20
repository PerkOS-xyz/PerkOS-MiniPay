"use client";

import { useState, type ReactNode } from "react";
import nextDynamic from "next/dynamic";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./lib/wagmi";
import { AutoConnect } from "./components/AutoConnect";
import { useMiniPayHost } from "./lib/useIsMiniPay";
import { dynamicBrowserEnabled } from "./lib/dynamicBrowser";
import { LanguageProvider } from "./lib/i18n";

// Code-split: the @dynamic-labs SDK ships only to the browser host, never to
// the MiniPay webview. ssr:false — Dynamic is browser-only and the plain tree
// is what's server-rendered (host is null during SSR). The loading fallback
// matches the app background to avoid a white flash while the chunk downloads.
const DynamicProviders = nextDynamic(
  () => import("./components/DynamicProviders"),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: "100vh", background: "#0e0716" }} />,
  },
);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Only wrap with Dynamic in a real browser tab (and only when the shared
  // PerkOS environment id is set). The MiniPay webview keeps the injected
  // wagmi connector untouched and never downloads Dynamic; while the host is
  // still resolving (null) we render the plain tree.
  const isMiniPayHost = useMiniPayHost();

  if (dynamicBrowserEnabled(isMiniPayHost)) {
    return (
      <LanguageProvider>
        <DynamicProviders queryClient={queryClient}>{children}</DynamicProviders>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AutoConnect />
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </LanguageProvider>
  );
}
