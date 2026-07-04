"use client";

import { useCallback, useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";
import { CUSD } from "../lib/tokenAddresses";
import { usePayCusd } from "../lib/usePayCusd";
import { getBillingMe, getPacks, depositCelo, type BillingMe, type CreditPacks } from "../lib/perkosApi";

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

export function WalletPanel({ address }: { address: string }) {
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

  const { data: cusdRaw, refetch } = useReadContract({
    address: CUSD.address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [account],
    chainId: celo.id,
    query: { enabled: Boolean(address) },
  });
  const cusd = cusdRaw !== undefined ? formatUnits(cusdRaw as bigint, CUSD.decimals) : undefined;

  async function buyPack(pack: { usd: number; credits: number }) {
    setMsg(null);
    if (!PAYMENT_ADDRESS) {
      setMsg("Top-ups aren't configured yet.");
      return;
    }
    setBusy(true);
    try {
      const hash = await pay(PAYMENT_ADDRESS, String(pack.usd));
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

  const displayPacks = packs?.packs ?? [
    { usd: 0.25, credits: 10 },
    { usd: 1, credits: 50 },
    { usd: 5, credits: 300 },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">Your credits</p>
          <p className="text-2xl font-semibold">
            {billing ? billing.credits : "—"} <span className="text-sm font-normal">credits</span>
          </p>
          {billing && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {billing.exempt
                ? "Sponsored — runs are free for you"
                : billing.membershipActive
                  ? "Member · included credits monthly"
                  : `${billing.freeWorkflowsLeft}/${billing.freeWorkflowsPerMonth} free workflows left this month`}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)]">cUSD</p>
          <p className="text-sm font-medium">{cusd ? Number(cusd).toFixed(2) : "—"}</p>
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
      <p className="mt-2 text-xs text-[var(--muted)]">Credits pay for the work · gas is paid in cUSD</p>
      {msg && <p className="mt-1 text-xs text-[var(--muted)]">{msg}</p>}
    </section>
  );
}
