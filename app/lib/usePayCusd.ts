"use client";

import { useContext } from "react";
import { useWalletClient } from "wagmi";
import { celo } from "wagmi/chains";
import type { WalletClient } from "viem";
import { CUSD, type TokenInfo } from "./tokenAddresses";
import { sendCeloStablecoinTransfer } from "./celo";
import { DynamicWalletContext } from "./dynamicWallet";

/**
 * Hook around the one stablecoin-transfer path. `pay` sends cUSD (or another
 * stablecoin) with gas paid in cUSD, as a legacy tx — the MiniPay rules.
 *
 * Wallet source mirrors useWalletSession: Dynamic's viem client in a browser
 * tab (wagmi has no connection on the bridgeless path), wagmi's injected
 * client inside MiniPay. Dynamic wallets ride the shared PerkOS dashboard and
 * may sit on another network — we switch to Celo before sending.
 *
 * Settlement (crediting the user's balance for pay-as-you-go) is verified
 * server-side from the returned transaction hash by the MiniPay billing API.
 */
export function usePayCusd() {
  const dyn = useContext(DynamicWalletContext);
  const { data: wagmiClient } = useWalletClient({ chainId: celo.id });
  const useDynamic = Boolean(dyn?.isConnected);

  return {
    ready: useDynamic || Boolean(wagmiClient),
    pay: async (
      to: `0x${string}`,
      amount: string,
      token: TokenInfo = CUSD,
    ): Promise<`0x${string}`> => {
      let walletClient: WalletClient;
      if (useDynamic) {
        walletClient = await dyn!.getWalletClient();
        if (walletClient.chain?.id !== celo.id) {
          await walletClient.switchChain({ id: celo.id });
          // Re-fetch: the client's bound `chain` doesn't mutate in place.
          walletClient = await dyn!.getWalletClient();
        }
      } else {
        if (!wagmiClient) throw new Error("Wallet not ready");
        walletClient = wagmiClient;
      }
      return sendCeloStablecoinTransfer({ walletClient, token, to, amount });
    },
  };
}
