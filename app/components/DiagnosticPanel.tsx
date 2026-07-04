"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";

import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";
import { detectMiniPay } from "../lib/useIsMiniPay";

/**
 * On-screen access diagnostic (like PerkOS App's debug log) — confirms the
 * mini-app actually reached the user's wallet inside the MiniPay webview, and
 * shows WHERE their money is. If MiniPay's home shows a balance but the app
 * reads 0 cUSD, this reveals the funds are in USDT/USDC (6-dec), not cUSD
 * (18-dec), or that a different address was injected than expected.
 *
 * Collapsed by default (a one-line status). Read-only; no side effects.
 */

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function useTokenBalance(token: TokenInfo, account?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: token.address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: celo.id,
    query: { enabled: Boolean(account) },
  });
  return {
    value: data !== undefined ? Number(formatUnits(data as bigint, token.decimals)) : undefined,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export function DiagnosticPanel({ address }: { address?: string }) {
  const [open, setOpen] = useState(false);
  const wagmi = useAccount();
  const account = (address ?? wagmi.address) as `0x${string}` | undefined;

  const isMiniPay = detectMiniPay();
  const eth =
    typeof window !== "undefined"
      ? (window as unknown as { ethereum?: Record<string, unknown> }).ethereum
      : undefined;
  const providerFlags = eth
    ? Object.keys(eth)
        .filter((k) => k.startsWith("is") && (eth as Record<string, unknown>)[k] === true)
        .join(", ") || "(no is* flags)"
    : "(no window.ethereum)";

  const cusd = useTokenBalance(CUSD, account);
  const usdc = useTokenBalance(USDC, account);
  const usdt = useTokenBalance(USDT, account);
  const total = [cusd.value, usdc.value, usdt.value]
    .filter((v): v is number => typeof v === "number")
    .reduce((s, v) => s + v, 0);

  const hasAccess = Boolean(account);
  const balancesReady = cusd.value !== undefined || usdc.value !== undefined || usdt.value !== undefined;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
      >
        <span className="flex items-center gap-2">
          <span className={hasAccess ? "text-[#4ade80]" : "text-amber-300"}>
            {hasAccess ? "●" : "○"}
          </span>
          <span className="font-medium">Diagnostics</span>
          <span className="text-[var(--muted)]">
            {isMiniPay ? "MiniPay" : "browser"} · {shortAddr(account)}
            {balancesReady ? ` · $${total.toFixed(2)}` : ""}
          </span>
        </span>
        <span className="text-[var(--muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-3 font-mono">
          <Row k="MiniPay host" v={isMiniPay ? "yes (isMiniPay)" : "no"} />
          <Row k="window.ethereum" v={eth ? "present" : "MISSING"} tone={eth ? "ok" : "warn"} />
          <Row k="provider flags" v={providerFlags} />
          <Row
            k="wallet connected"
            v={wagmi.isConnected ? "yes" : "no"}
            tone={wagmi.isConnected ? "ok" : "warn"}
          />
          <Row k="connector" v={wagmi.connector?.name ?? "—"} />
          <Row k="chain id" v={wagmi.chainId ? String(wagmi.chainId) : "—"} tone={wagmi.chainId === celo.id ? "ok" : wagmi.chainId ? "warn" : undefined} />
          <Row k="session addr" v={address ?? "—"} wrap />
          <Row k="wagmi addr" v={wagmi.address ?? "—"} wrap />

          <div className="mt-1 border-t border-white/10 pt-2 text-[var(--muted)]">
            Balances at {shortAddr(account)} (Celo)
          </div>
          <Bal label="cUSD (18d)" b={cusd} />
          <Bal label="USDT (6d)" b={usdt} />
          <Bal label="USDC (6d)" b={usdc} />
          <Row k="total stable" v={balancesReady ? `$${total.toFixed(2)}` : "loading…"} tone="ok" />

          {total === 0 && balancesReady && hasAccess && (
            <p className="mt-1 rounded-lg bg-amber-300/10 p-2 text-amber-200/90">
              This address holds 0 in all three stablecoins. If MiniPay shows a balance, the injected
              address differs from the funded one (or it&apos;s a token we don&apos;t read yet).
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ k, v, tone, wrap }: { k: string; v: string; tone?: "ok" | "warn"; wrap?: boolean }) {
  const c = tone === "ok" ? "text-[#4ade80]" : tone === "warn" ? "text-amber-300" : "text-foreground";
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[var(--muted)]">{k}</span>
      <span className={`text-right ${c} ${wrap ? "break-all" : ""}`}>{v}</span>
    </div>
  );
}

function Bal({ label, b }: { label: string; b: { value?: number; isLoading: boolean; error: string | null } }) {
  const v = b.error
    ? `err: ${b.error.slice(0, 24)}`
    : b.value === undefined
      ? b.isLoading
        ? "loading…"
        : "—"
      : b.value.toFixed(b.value < 1 ? 4 : 2);
  return <Row k={label} v={v} tone={b.value && b.value > 0 ? "ok" : undefined} />;
}
