"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits } from "viem";

import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";
import { selectPaymentToken } from "../lib/selectPaymentToken";
import { usePayCusd } from "../lib/usePayCusd";
import { ensureServerWallet } from "../lib/perkosApi";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Phase 1 of the on-chain wallet: the team's PerkOS-operated server wallet
 * (Dynamic MPC). Read + deposit only — no agent spend yet. Creates the wallet
 * via /wallet/ensure, shows its Celo address (deposit target) and its spendable
 * cUSD/USDT/USDC balance (read client-side — MiniPay's working currency is cUSD,
 * whereas the API's /wallet/balances tracks USDC + $PERKOS for the main app).
 */
export function ServerWallet({ address }: { address: string }) {
  const { pay, ready } = usePayCusd();
  const [addr, setAddr] = useState<`0x${string}` | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ensureServerWallet()
      .then((w) => {
        setAddr(w.address as `0x${string}`);
        setState("ready");
      })
      .catch((e) => {
        setState("error");
        setMsg(e instanceof Error ? e.message : "Couldn't set up your team wallet.");
      });
  }, []);

  function useBal(token: TokenInfo, owner: `0x${string}` | null) {
    const { data, refetch } = useReadContract({
      address: token.address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: owner ? [owner] : undefined,
      chainId: celo.id,
      query: { enabled: Boolean(owner) },
    });
    const value = data !== undefined ? Number(formatUnits(data as bigint, token.decimals)) : undefined;
    return { value, refetch };
  }
  const cusd = useBal(CUSD, addr);
  const usdt = useBal(USDT, addr);
  const usdc = useBal(USDC, addr);
  const payer = address as `0x${string}`;
  const payerCusd = useBal(CUSD, payer);
  const payerUsdt = useBal(USDT, payer);
  const payerUsdc = useBal(USDC, payer);
  const payerReady =
    payerCusd.value !== undefined || payerUsdt.value !== undefined || payerUsdc.value !== undefined;
  const refetch = () => {
    cusd.refetch();
    usdt.refetch();
    usdc.refetch();
    payerCusd.refetch();
    payerUsdt.refetch();
    payerUsdc.refetch();
  };
  const ready3 = cusd.value !== undefined || usdt.value !== undefined || usdc.value !== undefined;
  const spendable = (cusd.value ?? 0) + (usdt.value ?? 0) + (usdc.value ?? 0);

  function copy() {
    if (!addr) return;
    navigator.clipboard
      .writeText(addr)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  // Pay with the stablecoin the user actually holds (MiniPay defaults to USDT).
  function payTokenFor(usd: number): TokenInfo | null {
    return selectPaymentToken(usd, [
      { token: USDT, balance: payerUsdt.value },
      { token: CUSD, balance: payerCusd.value },
      { token: USDC, balance: payerUsdc.value },
    ]);
  }

  async function deposit(usd: number) {
    if (!addr) return;
    setMsg(null);
    const token = payTokenFor(usd);
    if (!token) {
      setMsg(`You need at least $${usd} in USDT, cUSD or USDC to deposit.`);
      return;
    }
    setBusy(true);
    try {
      setMsg(`Depositing $${usd} ${token.symbol}…`);
      await pay(addr, String(usd), token);
      setMsg("Deposit sent — it'll show here in a moment.");
      setTimeout(refetch, 5000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Deposit failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Team wallet</h1>
        <p className="text-sm text-[var(--muted)]">
          The wallet your team uses to pay on your behalf, on Celo. Deposit cUSD here; your team
          spends from it only when you approve. Your personal wallet stays private — its key is
          never shared.
        </p>
      </div>

      {state === "error" ? (
        <p className="text-sm text-red-300">{msg}</p>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[var(--muted)]">Balance on Celo</p>
            <p className="text-3xl font-semibold">{ready3 ? `$${spendable.toFixed(2)}` : "—"}</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {state === "loading" ? "Setting up your wallet…" : short}
              </span>
              <button
                type="button"
                onClick={copy}
                disabled={!addr}
                className="shrink-0 text-xs text-[var(--accent)] disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Deposit by sending cUSD to this address, or use the buttons below.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Deposit</p>
            <div className="flex flex-wrap gap-2">
              {[0.25, 1, 5].map((usd) => (
                <button
                  key={usd}
                  type="button"
                  onClick={() => deposit(usd)}
                  disabled={busy || !ready || !addr || !payerReady}
                  className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  ${usd.toFixed(2)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Sent from your wallet · pay with USDT, cUSD or USDC
            </p>
          </div>

          {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}
        </>
      )}
    </section>
  );
}
