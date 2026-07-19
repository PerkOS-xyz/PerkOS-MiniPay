import type { TokenInfo } from "./tokenAddresses";

export type TokenBalance = {
  token: TokenInfo;
  balance: number | undefined;
};

/** Select the best stablecoin the paying wallet can actually use. */
export function selectPaymentToken(usd: number, balances: TokenBalance[]): TokenInfo | null {
  if (!Number.isFinite(usd) || usd <= 0) return null;

  return (
    balances
      .filter(({ balance }) => Number.isFinite(balance) && (balance ?? 0) >= usd)
      .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))[0]?.token ?? null
  );
}
