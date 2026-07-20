export const CREDIT_USD = 0.02;

export function creditsToUsd(credits: number): string {
  const amount = Math.max(0, Number.isFinite(credits) ? credits : 0) * CREDIT_USD;
  return amount.toFixed(2);
}
