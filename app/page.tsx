"use client";

import { useAccount, useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";
import { useIsMiniPay } from "./lib/useIsMiniPay";
import { CUSD } from "./lib/tokenAddresses";

// wagmi v3 dropped `useBalance({ token })`; read the ERC20 balance directly.
const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// The free "starter team" — basic generalist helpers, nothing that needs marketing/dev skills.
// These are placeholders for the souls authored on the feature branch.
const STARTER_TEAM = [
  { name: "Assistant", glyph: "✦", blurb: "Answers, messages, reminders, quick lookups" },
  { name: "Money helper", glyph: "▲", blurb: "Track income & expenses, weekly summaries" },
  { name: "Customer replies", glyph: "◆", blurb: "Draft replies to customers in your voice" },
];

function shorten(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export default function Home() {
  const isMiniPay = useIsMiniPay();
  const { address, isConnected } = useAccount();
  const { data: cusdRaw } = useReadContract({
    address: CUSD.address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: celo.id,
    query: { enabled: Boolean(address) },
  });
  const cusd =
    cusdRaw !== undefined ? formatUnits(cusdRaw as bigint, CUSD.decimals) : undefined;

  return (
    <main className="flex flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Your AI team</h1>
        <p className="text-sm text-[var(--muted)]">
          A coworking of agents for your small business — on Celo, in MiniPay.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {isConnected ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">Wallet</p>
              <p className="font-mono text-sm">{shorten(address)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--muted)]">cUSD</p>
              <p className="text-lg font-semibold">
                {cusd ? Number(cusd).toFixed(2) : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {isMiniPay ? "Connecting your wallet…" : "Open this app inside MiniPay to start."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted)]">Starter team</h2>
        {STARTER_TEAM.map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-lg"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
              aria-hidden
            >
              {m.glyph}
            </span>
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-[var(--muted)]">{m.blurb}</p>
            </div>
          </div>
        ))}
      </section>

      <button
        className="mt-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-center font-medium text-white active:scale-[0.99]"
        disabled
      >
        Start my team — free
      </button>
      <p className="text-center text-xs text-[var(--muted)]">
        Free to start · pay only for work, in cUSD
      </p>
    </main>
  );
}
