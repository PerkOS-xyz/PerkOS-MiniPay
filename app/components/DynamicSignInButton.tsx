"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

/**
 * Browser-only "Continue with email or wallet" button that opens Dynamic's
 * auth flow. Once the user connects, DynamicWalletBridge publishes the wallet
 * to DynamicWalletContext → useWalletSession flips to connected and the normal
 * sign-in (sign nonce → Firebase) proceeds, signing via Dynamic natively.
 *
 * Render ONLY when `dynamicBrowserEnabled()` is true — `useDynamicContext`
 * throws if DynamicContextProvider isn't mounted.
 */
export function DynamicSignInButton() {
  const { setShowAuthFlow } = useDynamicContext();
  return (
    <button
      type="button"
      onClick={() => setShowAuthFlow(true)}
      className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-medium text-white"
    >
      Continue with email or wallet
    </button>
  );
}
