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
  /**
   * Address to set as `feeCurrency` when PAYING GAS in this token. Celo prices
   * gas in 18 decimals, so 6-decimal tokens (USDC/USDT) need a FeeCurrencyAdapter
   * that normalizes decimals — the adapter address ≠ the token address. cUSD is
   * 18-dec so it's its own fee currency. Verified from docs.celo.org (mainnet).
   * MiniPay's fee abstraction then deducts gas from THIS token's balance, so a
   * user holding only USDT can transact without any cUSD/CELO.
   */
  feeAdapter: `0x${string}`;
};

/** cUSD / USDm — the Mento USD stablecoin. 18-dec, its own fee currency. */
export const CUSD: TokenInfo = {
  address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  symbol: "cUSD",
  decimals: 18,
  feeAdapter: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
};

/** Native USDC on Celo (Circle). 6 decimals → gas via FeeCurrencyAdapter. */
export const USDC: TokenInfo = {
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  symbol: "USDC",
  decimals: 6,
  feeAdapter: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
};

/** USDT on Celo (MiniPay's default token). 6 decimals → gas via FeeCurrencyAdapter. */
export const USDT: TokenInfo = {
  address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
  symbol: "USDT",
  decimals: 6,
  feeAdapter: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",
};

export const STABLECOINS: Record<string, TokenInfo> = {
  cUSD: CUSD,
  USDC,
  USDT,
};

/** Default fee currency when a caller has not selected a payment token. */
export const FEE_CURRENCY: `0x${string}` = CUSD.address;
