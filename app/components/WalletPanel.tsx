"use client";

import { useCallback, useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";
import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";
import { usePayCusd } from "../lib/usePayCusd";
import {
  getBillingMe,
  getPacks,
  depositCelo,
  buyMembership,
  type BillingMe,
  type CreditPacks,
} from "../lib/perkosApi";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Where credit top-ups (cUSD) are sent. MUST equal the API's MiniPay treasury
// (MINIPAY_TREASURY / BILLING_X402_PAY_TO) — the deposit verifier checks the
// transfer landed there before crediting.
const PAYMENT_ADDRESS = (process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ?? "") as `0x${string}`;

export function WalletPanel({ address, compact = false }: { address: string; compact?: boolean }) {
  const account = address as `0x${string}`;
  const { pay, ready } = usePayCusd();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [packs, setPacks] = useState<CreditPacks | null>(null);

  const refreshBilling = useCallback(() => {
    getBillingMe().then(setBilling).catch(() => {});
  }, []);

  useEffect(() => {
    refreshBilling();
    getPacks().then(setPacks).catch(() => {});
  }, [refreshBilling]);

  // MiniPay holds funds in USDT by default (not cUSD), so read all three
  // stablecoins and show the total — the real spendable "Dollars" balance.
  function useBal(token: TokenInfo) {
    const { data, refetch } = useReadContract({
      address: token.address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [account],
      chainId: celo.id,
      query: { enabled: Boolean(address) },
    });
    const value = data !== undefined ? Number(formatUnits(data as bigint, token.decimals)) : undefined;
    return { value, refetch };
  }
  const cusdBal = useBal(CUSD);
  const usdtBal = useBal(USDT);
  const usdcBal = useBal(USDC);
  const refetch = () => {
    cusdBal.refetch();
    usdtBal.refetch();
    usdcBal.refetch();
  };
  const ready3 =
    cusdBal.value !== undefined || usdtBal.value !== undefined || usdcBal.value !== undefined;
  const walletUsd = (cusdBal.value ?? 0) + (usdtBal.value ?? 0) + (usdcBal.value ?? 0);

  // Pay with the stablecoin the user actually holds — highest balance that
  // covers the pack (MiniPay users hold USDT, so this avoids the cUSD-only trap).
  function payTokenFor(usd: number): TokenInfo | null {
    const opts: Array<[TokenInfo, number]> = [
      [USDT, usdtBal.value ?? 0],
      [CUSD, cusdBal.value ?? 0],
      [USDC, usdcBal.value ?? 0],
    ];
    const covering = opts.filter(([, bal]) => bal >= usd).sort((a, b) => b[1] - a[1]);
    return covering[0]?.[0] ?? null;
  }

  async function buyPack(pack: { usd: number; credits: number }) {
    setMsg(null);
    if (!PAYMENT_ADDRESS) {
      setMsg("Top-ups aren't configured yet.");
      return;
    }
    const token = payTokenFor(pack.usd);
    if (!token) {
      setMsg(`You need at least $${pack.usd} in USDT, cUSD or USDC to buy this pack.`);
      return;
    }
    setBusy(true);
    try {
      setMsg(`Paying ${pack.usd} ${token.symbol}…`);
      const hash = await pay(PAYMENT_ADDRESS, String(pack.usd), token);
      setMsg("Confirming payment…");
      // The verifier reads the tx on-chain; retry briefly if it's not mined yet.
      let credited = false;
      for (let i = 0; i < 4 && !credited; i++) {
        try {
          const r = await depositCelo(hash);
          setMsg(`Added ${r.added} credits`);
          credited = true;
        } catch {
          await new Promise((res) => setTimeout(res, 3000));
        }
      }
      if (!credited) setMsg("Payment sent — credits will appear shortly.");
      refreshBilling();
      setTimeout(() => refetch(), 4000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function buyTier(key: "basic" | "pro", usd: number) {
    setMsg(null);
    if (!PAYMENT_ADDRESS) {
      setMsg("Membership isn't configured yet.");
      return;
    }
    const token = payTokenFor(usd);
    if (!token) {
      setMsg(`You need at least $${usd} in USDT, cUSD or USDC to go ${key}.`);
      return;
    }
    setBusy(true);
    try {
      setMsg(`Paying ${usd} ${token.symbol}…`);
      const hash = await pay(PAYMENT_ADDRESS, String(usd), token);
      setMsg("Activating membership…");
      let done = false;
      for (let i = 0; i < 4 && !done; i++) {
        const r = await buyMembership(key, hash);
        if (r.ok) {
          setMsg(`You're on ${key[0].toUpperCase() + key.slice(1)} — +${r.credits} credits`);
          done = true;
        } else {
          await new Promise((res) => setTimeout(res, 3000));
        }
      }
      if (!done) setMsg("Payment sent — membership will activate shortly.");
      refreshBilling();
      setTimeout(() => refetch(), 4000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Membership payment failed");
    } finally {
      setBusy(false);
    }
  }

  const displayPacks = packs?.packs ?? [
    { usd: 0.25, credits: 10 },
    { usd: 1, credits: 50 },
    { usd: 5, credits: 300 },
  ];
  const tiers = packs?.tiers;
  const currentTier = billing?.membershipTier ?? "free";
  // Offer a tier only when it's an upgrade (free → basic/pro, basic → pro).
  const tierOffers = tiers
    ? ([["basic", tiers.basic] as const, ["pro", tiers.pro] as const]).filter(([key]) =>
        currentTier === "free" ? true : currentTier === "basic" ? key === "pro" : false,
      )
    : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          {/* Compact = the dashboard's Overview already owns the credits/free
              numbers, so we don't repeat them here — just a buy affordance. */}
          {compact ? (
            <p className="text-sm font-medium">Buy credits</p>
          ) : (
            <>
              <p className="text-xs text-[var(--muted)]">Your credits</p>
              <p className="text-2xl font-semibold">
                {billing ? billing.credits : "—"} <span className="text-sm font-normal">credits</span>
              </p>
              {billing && (
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {billing.exempt
                    ? "Sponsored, runs are free for you"
                    : billing.membershipActive
                      ? "Member, included credits monthly"
                      : `${billing.freeWorkflowsLeft}/${billing.freeWorkflowsPerMonth} free workflows left this month`}
                </p>
              )}
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)]">In wallet</p>
          <p className="text-sm font-medium">{ready3 ? `$${walletUsd.toFixed(2)}` : "—"}</p>
          {ready3 && (usdtBal.value ?? 0) > 0 && (
            <p className="text-[10px] text-[var(--muted)]">{(usdtBal.value ?? 0).toFixed(2)} USDT</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {displayPacks.map((p) => (
          <button
            key={p.usd}
            onClick={() => buyPack(p)}
            disabled={busy || !ready}
            className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            +{p.credits}
            <span className="ml-1 text-[10px] font-normal opacity-80">${p.usd}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Credits pay for the work · pay with USDT, cUSD or USDC</p>

      {tierOffers.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-sm font-medium">
            {currentTier === "basic" ? "Go Pro" : "Membership"}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            More credits every month + a higher analysis limit.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {tierOffers.map(([key, t]) => (
              <button
                key={key}
                onClick={() => buyTier(key, t.usd)}
                disabled={busy || !ready}
                className="flex items-center justify-between rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2.5 text-left disabled:opacity-50"
              >
                <span>
                  <span className="block text-sm font-medium capitalize">{key}</span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {t.credits} credits/mo · {t.monthlyAnalysisCap} analyses
                  </span>
                </span>
                <span className="text-sm font-semibold">${t.usd}/mo</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {billing?.membershipActive && (
        <p className="mt-2 text-[11px] text-[#4ade80]">
          {currentTier === "pro" ? "Pro member" : "Member"} · renews monthly
        </p>
      )}
      {msg && <p className="mt-1 text-xs text-[var(--muted)]">{msg}</p>}
    </section>
  );
}
