"use client";

/**
 * Dynamic (dynamic.xyz) browser-only wallet connector for PerkOS-MiniPay.
 *
 * PerkOS-MiniPay runs in 2 host contexts: the MiniPay webview (injected
 * EIP-1193 provider flagged `isMiniPay`, implicit connect, NO connect button)
 * and a regular browser tab. Inside MiniPay the host owns the wallet and
 * Dynamic must never mount. In a browser we offer Dynamic's connect modal +
 * embedded wallets instead of the bare injected() button.
 *
 * Credentials: NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is the SAME environment id
 * the main PerkOS App uses (one Dynamic dashboard, shared users/settings).
 * The dashboard's enabled EVM networks include Celo, which is the only chain
 * this app transacts on.
 *
 * Activation is gated behind the env var: when unset, Dynamic never mounts
 * and the app behaves exactly as before (injected Connect button) — a
 * zero-regression, opt-in feature flag.
 */
export const DYNAMIC_ENV_ID =
  process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "";

/**
 * True only when the host has resolved to a real browser tab
 * (`isMiniPayHost === false`) AND a Dynamic environment id is configured.
 * `null` (host still resolving) and `true` (MiniPay webview) both return
 * false — Dynamic must never mount inside MiniPay.
 */
export function dynamicBrowserEnabled(isMiniPayHost: boolean | null): boolean {
  if (isMiniPayHost !== false) return false;
  return DYNAMIC_ENV_ID !== "";
}
