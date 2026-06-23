// Celo mainnet stablecoins used by PerkOS-MiniPay.
//
// ⚠️ DECIMALS TRAP: cUSD uses 18 decimals, but USDC and USDT on Celo use 6.
// Mixing them up sends 1e12× the intended amount. Always read `decimals` from here.
//
// ⚠️ NAMING: Mento rebranded cUSD → USDm (same contract). They are the same token.

export type TokenInfo = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

/** cUSD / USDm — the Mento USD stablecoin. Also the fee-currency MiniPay pays gas in. */
export const CUSD: TokenInfo = {
  address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  symbol: "cUSD",
  decimals: 18,
};

/** Native USDC on Celo (Circle). 6 decimals. */
export const USDC: TokenInfo = {
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  symbol: "USDC",
  decimals: 6,
};

/** USDT on Celo. 6 decimals. */
export const USDT: TokenInfo = {
  address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
  symbol: "USDT",
  decimals: 6,
};

export const STABLECOINS: Record<string, TokenInfo> = {
  cUSD: CUSD,
  USDC,
  USDT,
};

/** MiniPay currently abstracts gas through cUSD only. */
export const FEE_CURRENCY: `0x${string}` = CUSD.address;
