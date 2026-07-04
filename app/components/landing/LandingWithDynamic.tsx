"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

import { MiniPayLanding } from "./MiniPayLanding";

/**
 * Browser landing with the "Get started" CTA wired to Dynamic's auth flow.
 * Split out (and lazy-loaded from page.tsx) because `useDynamicContext` pulls
 * @dynamic-labs and throws unless DynamicContextProvider is mounted — which it
 * is exactly when DynamicWalletContext is non-null (the browser path).
 */
export function LandingWithDynamic() {
  const { setShowAuthFlow } = useDynamicContext();
  return <MiniPayLanding onGetStarted={() => setShowAuthFlow(true)} />;
}
