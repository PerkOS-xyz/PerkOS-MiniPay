"use client";

import { createContext } from "react";

/**
 * Bridgeless Dynamic wallet state — the SAME pattern as the main PerkOS App
 * (see PerkOS/app/lib/dynamicWallet.ts and DYNAMIC-WAGMI-LOGIN-FIX.md):
 * we deliberately do NOT use `@dynamic-labs/wagmi-connector` (it pins wagmi ^2
 * and drops the connection mid-sign-in on wagmi v3 → ConnectorNotConnectedError).
 * Instead the browser path reads the wallet straight from Dynamic
 * (`useDynamicContext().primaryWallet`) and signs with Dynamic's own signer,
 * never touching the wagmi connector.
 *
 * Provided by <DynamicWalletBridge/> (browser/Dynamic path only). It's `null`
 * inside the MiniPay host — there Dynamic isn't mounted and useWalletSession
 * keeps using wagmi's injected connector exactly as before.
 */
export type DynamicWalletState = {
  address: string | undefined;
  isConnected: boolean;
  signMessage: (message: string) => Promise<string>;
  /**
   * Log out of Dynamic (clears `primaryWallet`). Required for a real browser
   * logout: wagmi's `disconnect()` is a no-op here since Dynamic — not wagmi —
   * owns the wallet.
   */
  logout: () => Promise<void>;
};

export const DynamicWalletContext = createContext<DynamicWalletState | null>(
  null,
);
