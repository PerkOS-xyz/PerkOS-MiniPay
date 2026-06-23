"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";
import { CUSD } from "../lib/tokenAddresses";
import { usePayCusd } from "../lib/usePayCusd";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Where pay-as-you-go cUSD goes. Configure to the platform/escrow address.
const PAYMENT_ADDRESS = (process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ?? "") as `0x${string}`;

export function WalletPanel() {
  const { address } = useAccount();
  const { pay, ready } = usePayCusd();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: cusdRaw, refetch } = useReadContract({
    address: CUSD.address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: celo.id,
    query: { enabled: Boolean(address) },
  });
  const cusd = cusdRaw !== undefined ? formatUnits(cusdRaw as bigint, CUSD.decimals) : undefined;

  async function topUp(amount: string) {
    setMsg(null);
    if (!PAYMENT_ADDRESS) {
      setMsg("Payment address not configured (NEXT_PUBLIC_PAYMENT_ADDRESS).");
      return;
    }
    setBusy(true);
    try {
      const hash = await pay(PAYMENT_ADDRESS, amount);
      setMsg(`Sent · ${hash.slice(0, 10)}…`);
      setTimeout(() => refetch(), 4000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">Your balance</p>
          <p className="text-2xl font-semibold">
            {cusd ? Number(cusd).toFixed(2) : "—"} <span className="text-sm">cUSD</span>
          </p>
        </div>
        <div className="flex gap-2">
          {["1", "5"].map((amt) => (
            <button
              key={amt}
              onClick={() => topUp(amt)}
              disabled={busy || !ready}
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              +{amt}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Pay only for work · gas is paid in cUSD</p>
      {msg && <p className="mt-1 text-xs text-[var(--muted)]">{msg}</p>}
    </section>
  );
}
