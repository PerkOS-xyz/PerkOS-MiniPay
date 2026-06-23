"use client";

import { useWalletClient } from "wagmi";
import { celo } from "wagmi/chains";
import { CUSD, type TokenInfo } from "./tokenAddresses";
import { sendCeloStablecoinTransfer } from "./celo";

/**
 * Hook around the one stablecoin-transfer path. `pay` sends cUSD (or another stablecoin) with gas
 * paid in cUSD, as a legacy tx — the MiniPay rules. Settlement (crediting the user's balance for
 * pay-as-you-go) is verified server-side from the returned tx hash. TODO: wire the settlement
 * endpoint once PerkOS-API exposes a Celo cUSD-deposit verifier (today billing is x402 on Base).
 */
export function usePayCusd() {
  const { data: walletClient } = useWalletClient({ chainId: celo.id });

  return {
    ready: Boolean(walletClient),
    pay: async (
      to: `0x${string}`,
      amount: string,
      token: TokenInfo = CUSD,
    ): Promise<`0x${string}`> => {
      if (!walletClient) throw new Error("Wallet not ready");
      return sendCeloStablecoinTransfer({ walletClient, token, to, amount });
    },
  };
}
