import { encodeFunctionData, parseUnits, type WalletClient } from "viem";
import { type TokenInfo } from "./tokenAddresses";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * Send a stablecoin transfer the MiniPay way. This is the ONE place on-chain spends go through,
 * so the two non-negotiable MiniPay rules live here:
 *   - gas paid via `feeCurrency` = the TOKEN BEING SENT's fee adapter (fee
 *     abstraction, rule C5) — so a user holding only USDT pays gas in USDT,
 *     with no cUSD/CELO needed. cUSD is its own adapter; USDC/USDT use theirs.
 *   - LEGACY transaction — never set maxFeePerGas / maxPriorityFeePerGas (rule C6)
 *
 * `amount` is in human units (e.g. "1.5"); decimals come from the token (cUSD=18, USDC/USDT=6).
 */
export async function sendCeloStablecoinTransfer(params: {
  walletClient: WalletClient;
  token: TokenInfo;
  to: `0x${string}`;
  amount: string;
}): Promise<`0x${string}`> {
  const { walletClient, token, to, amount } = params;
  const account = walletClient.account;
  if (!account) throw new Error("walletClient has no account connected");

  return walletClient.sendTransaction({
    account,
    chain: walletClient.chain,
    to: token.address,
    data: encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [to, parseUnits(amount, token.decimals)],
    }),
    // MiniPay fee abstraction — pay gas in the token being sent (via its adapter).
    feeCurrency: token.feeAdapter,
    // MiniPay only accepts legacy transactions.
    type: "legacy",
    // viem's Celo chain extends the tx type with `feeCurrency`; the cast keeps this helper portable.
  } as Parameters<WalletClient["sendTransaction"]>[0]);
}
