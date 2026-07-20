"use client";

import { useCallback, useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";
import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";
import { selectPaymentToken } from "../lib/selectPaymentToken";
import { useLanguage } from "../lib/i18n";
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
  const { locale } = useLanguage();
  const tr = (en: string, es: string) => locale === "es" ? es : en;
  const account = address as `0x${string}`;
  const { pay, ready } = usePayCusd();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [packs, setPacks] = useState<CreditPacks | null>(null);
  const [showMembership, setShowMembership] = useState(false);
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "wallet" | "chain" | "done" | "pending" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [pendingPayment, setPendingPayment] = useState<
    | { kind: "pack"; hash: `0x${string}` }
    | { kind: "membership"; hash: `0x${string}`; tier: "basic" | "pro" }
    | null
  >(null);

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
  const canTopUp = ready && ready3 && Boolean(PAYMENT_ADDRESS);
  const topUpHint = !PAYMENT_ADDRESS
    ? tr("Top-ups are not configured yet.", "Las recargas todavía no están configuradas.")
    : !ready3
      ? tr("Checking your stablecoin balance…", "Consultando tu balance de stablecoins…")
      : !ready
        ? tr("Reconnect your wallet to buy credits.", "Reconecta tu wallet para comprar créditos.")
        : null;

  // Pay with the stablecoin the user actually holds — highest balance that
  // covers the pack (MiniPay users hold USDT, so this avoids the cUSD-only trap).
  function payTokenFor(usd: number): TokenInfo | null {
    return selectPaymentToken(usd, [
      { token: USDT, balance: usdtBal.value },
      { token: CUSD, balance: cusdBal.value },
      { token: USDC, balance: usdcBal.value },
    ]);
  }

  async function buyPack(pack: { usd: number; credits: number }) {
    setMsg(null);
    setTxHash(null);
    setPendingPayment(null);
    if (!PAYMENT_ADDRESS) {
      setMsg(tr("Top-ups aren't configured yet.", "Las recargas todavía no están configuradas."));
      return;
    }
    const token = payTokenFor(pack.usd);
    if (!token) {
      setMsg(tr(`You need at least $${pack.usd} in USDT, cUSD or USDC to buy this pack.`, `Necesitas al menos $${pack.usd} en USDT, cUSD o USDC para comprar este paquete.`));
      return;
    }
    setBusy(true);
    try {
      setPaymentStage("wallet");
      setMsg(tr(`Paying ${pack.usd} ${token.symbol}…`, `Esperando el pago de ${pack.usd} ${token.symbol}…`));
      const hash = await pay(PAYMENT_ADDRESS, String(pack.usd), token);
      setTxHash(hash);
      setPaymentStage("chain");
      setMsg(tr("Confirming payment on Celo…", "Confirmando el pago en Celo…"));
      // The verifier reads the tx on-chain; retry briefly if it's not mined yet.
      let credited = false;
      for (let i = 0; i < 4 && !credited; i++) {
        try {
          const r = await depositCelo(hash);
          setMsg(tr(`Added ${r.added} credits`, `Se agregaron ${r.added} créditos`));
          setPaymentStage("done");
          credited = true;
        } catch {
          await new Promise((res) => setTimeout(res, 3000));
        }
      }
      if (!credited) {
        setPendingPayment({ kind: "pack", hash });
        setPaymentStage("pending");
        setMsg(tr("Payment sent, but confirmation is taking longer than expected.", "El pago fue enviado, pero la confirmación está tardando más de lo esperado."));
      }
      refreshBilling();
      setTimeout(() => refetch(), 4000);
    } catch (e) {
      setPaymentStage("error");
      setMsg(e instanceof Error ? e.message : tr("Payment failed", "El pago falló"));
    } finally {
      setBusy(false);
    }
  }

  async function buyTier(key: "basic" | "pro", usd: number) {
    setMsg(null);
    setTxHash(null);
    setPendingPayment(null);
    if (!PAYMENT_ADDRESS) {
      setMsg(tr("Membership isn't configured yet.", "La membresía todavía no está configurada."));
      return;
    }
    const token = payTokenFor(usd);
    if (!token) {
      setMsg(tr(`You need at least $${usd} in USDT, cUSD or USDC to go ${key}.`, `Necesitas al menos $${usd} en USDT, cUSD o USDC para cambiar al plan ${key}.`));
      return;
    }
    setBusy(true);
    try {
      setPaymentStage("wallet");
      setMsg(tr(`Paying ${usd} ${token.symbol}…`, `Esperando el pago de ${usd} ${token.symbol}…`));
      const hash = await pay(PAYMENT_ADDRESS, String(usd), token);
      setTxHash(hash);
      setPaymentStage("chain");
      setMsg(tr("Activating membership…", "Activando la membresía…"));
      let done = false;
      for (let i = 0; i < 4 && !done; i++) {
        const r = await buyMembership(key, hash);
        if (r.ok) {
          setMsg(tr(`You're on ${key[0].toUpperCase() + key.slice(1)} · +${r.credits} credits`, `Plan ${key} activo · +${r.credits} créditos`));
          setPaymentStage("done");
          done = true;
        } else {
          await new Promise((res) => setTimeout(res, 3000));
        }
      }
      if (!done) {
        setPendingPayment({ kind: "membership", hash, tier: key });
        setPaymentStage("pending");
        setMsg(tr("Payment sent, but membership confirmation is taking longer than expected.", "El pago fue enviado, pero la membresía está tardando en confirmarse."));
      }
      refreshBilling();
      setTimeout(() => refetch(), 4000);
    } catch (e) {
      setPaymentStage("error");
      setMsg(e instanceof Error ? e.message : tr("Membership payment failed", "El pago de la membresía falló"));
    } finally {
      setBusy(false);
    }
  }

  async function retryVerification() {
    if (!pendingPayment || busy) return;
    setBusy(true);
    setPaymentStage("chain");
    setMsg(tr("Checking the transaction again…", "Consultando la transacción nuevamente…"));
    try {
      if (pendingPayment.kind === "pack") {
        const r = await depositCelo(pendingPayment.hash);
        setMsg(tr(`Added ${r.added} credits`, `Se agregaron ${r.added} créditos`));
      } else {
        const r = await buyMembership(pendingPayment.tier, pendingPayment.hash);
        if (!r.ok) throw new Error(r.message || tr("Membership is not confirmed yet.", "La membresía todavía no está confirmada."));
        setMsg(tr(`Membership active · +${r.credits} credits`, `Membresía activa · +${r.credits} créditos`));
      }
      setPaymentStage("done");
      setPendingPayment(null);
      refreshBilling();
      refetch();
    } catch (e) {
      setPaymentStage("pending");
      setMsg(e instanceof Error ? e.message : tr("Still waiting for confirmation.", "Todavía estamos esperando la confirmación."));
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
            <p className="text-sm font-medium">{tr("Buy credits", "Comprar créditos")}</p>
          ) : (
            <>
              <p className="text-xs text-[var(--muted)]">{tr("Your credits", "Tus créditos")}</p>
              <p className="text-2xl font-semibold">
                  {billing ? billing.credits : "—"} <span className="text-sm font-normal">{tr("credits", "créditos")}</span>
              </p>
              {billing && (
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {billing.exempt
                    ? tr("Sponsored, runs are free for you", "Patrocinado, los trabajos son gratis para ti")
                    : billing.membershipActive
                      ? tr("Member, monthly credits included", "Miembro, incluye créditos mensuales")
                      : tr(`${billing.freeWorkflowsLeft}/${billing.freeWorkflowsPerMonth} free workflows left this month`, `${billing.freeWorkflowsLeft}/${billing.freeWorkflowsPerMonth} trabajos gratis disponibles este mes`)}
                </p>
              )}
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)]">{tr("In wallet", "En la wallet")}</p>
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
            disabled={busy || !canTopUp}
            className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            +{p.credits}
            <span className="ml-1 text-[10px] font-normal opacity-80">${p.usd}</span>
          </button>
        ))}
      </div>
      {topUpHint && <p className="mt-2 text-xs text-amber-200/80">{topUpHint}</p>}
      <p className="mt-2 text-xs text-[var(--muted)]">{tr("Credits pay for the work · pay with USDT, cUSD or USDC", "Los créditos pagan el trabajo · usa USDT, cUSD o USDC")}</p>

      {tierOffers.length > 0 && !showMembership && (
        <button
          type="button"
          onClick={() => setShowMembership(true)}
          className="mt-3 w-full border-t border-white/10 pt-3 text-left text-xs font-medium text-[var(--accent)]"
        >
          {tr("Use PerkOS often? See optional monthly plans ›", "¿Usas PerkOS con frecuencia? Ver planes mensuales opcionales ›")}
        </button>
      )}

      {tierOffers.length > 0 && showMembership && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {currentTier === "basic" ? tr("Go Pro", "Cambiar a Pro") : tr("Optional monthly plans", "Planes mensuales opcionales")}
            </p>
            <button type="button" onClick={() => setShowMembership(false)} className="text-xs text-[var(--muted)]">
              {tr("Hide", "Ocultar")}
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            {tr("More credits every month and a higher analysis limit.", "Más créditos cada mes y un límite de análisis mayor.")}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {tierOffers.map(([key, t]) => (
              <button
                key={key}
                onClick={() => buyTier(key, t.usd)}
                disabled={busy || !canTopUp}
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
      {msg && (
        <div
          role="status"
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
            paymentStage === "done"
              ? "border-[#4ade80]/30 bg-[#4ade80]/10 text-[#4ade80]"
              : paymentStage === "error"
                ? "border-red-400/30 bg-red-400/10 text-red-200"
                : "border-white/10 bg-black/20 text-[var(--muted)]"
          }`}
        >
          <p>{msg}</p>
          <div className="mt-1 flex gap-3">
            {txHash && (
              <a
                href={`https://celoscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {tr("View transaction", "Ver transacción")}
              </a>
            )}
            {paymentStage === "pending" && pendingPayment && (
              <button type="button" onClick={retryVerification} disabled={busy} className="underline underline-offset-2">
                {tr("Check again", "Consultar nuevamente")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
