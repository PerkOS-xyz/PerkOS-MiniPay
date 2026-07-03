"use client";

import { type ReactNode, useMemo } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";

import {
  DynamicWalletContext,
  type DynamicWalletState,
} from "../lib/dynamicWallet";

/**
 * Publishes Dynamic's wallet state (address + native signer) into
 * DynamicWalletContext so useWalletSession can drive the browser sign-in from
 * Dynamic directly — no @dynamic-labs/wagmi-connector bridge (which drops the
 * connection on wagmi v3). Mirrors the main PerkOS App's DynamicWalletBridge.
 *
 * Renders ONLY inside DynamicContextProvider (DynamicProviders.tsx) — that's
 * the only place useDynamicContext is safe, and the only host where Dynamic
 * owns the wallet (a real browser tab). The MiniPay webview never mounts this,
 * so the context stays null there and useWalletSession falls back to wagmi.
 *
 * IMPORTANT: this bridge must LEAVE WAGMI ALONE — read Dynamic, sign with
 * Dynamic's native signer, never touch the wagmi connector (see
 * DYNAMIC-WAGMI-LOGIN-FIX.md in the workspace root for the full story).
 */
export function DynamicWalletBridge({ children }: { children: ReactNode }) {
  const { primaryWallet, handleLogOut } = useDynamicContext();

  const address = primaryWallet?.address;
  const isEvm = !!address && address.startsWith("0x") && address.length === 42;

  const value = useMemo<DynamicWalletState>(() => {
    const logout = async () => {
      await handleLogOut();
    };
    if (!primaryWallet || !isEvm) {
      return {
        address: undefined,
        isConnected: false,
        signMessage: async () => {
          throw new Error("No Dynamic wallet connected.");
        },
        getWalletClient: async () => {
          throw new Error("No Dynamic wallet connected.");
        },
        logout,
      };
    }
    return {
      address,
      isConnected: true,
      signMessage: async (message: string) => {
        const signature = await primaryWallet.signMessage(message);
        if (!signature) {
          throw new Error("Dynamic wallet returned an empty signature.");
        }
        return signature;
      },
      getWalletClient: async () => {
        if (!isEthereumWallet(primaryWallet)) {
          throw new Error("Connected Dynamic wallet is not an EVM wallet.");
        }
        return primaryWallet.getWalletClient();
      },
      logout,
    };
  }, [primaryWallet, address, isEvm, handleLogOut]);

  return (
    <DynamicWalletContext.Provider value={value}>
      {children}
    </DynamicWalletContext.Provider>
  );
}
