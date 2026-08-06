"use client";

import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";

import { translated, useLanguage } from "../lib/i18n";
import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";

const ERC20_BALANCE_ABI = [{
  type: "function",
  name: "balanceOf",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

type StableSymbol = "USDT" | "cUSD" | "USDC";

function useTokenBalance(token: TokenInfo, account: `0x${string}`) {
  const result = useReadContract({
    address: token.address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [account],
    chainId: celo.id,
  });
  const raw = result.data as bigint | undefined;
  return raw === undefined
    ? "—"
    : Number(formatUnits(raw, token.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function UserProfile({
  address,
  onOpenTransfer,
  onOpenBusinessWallet,
}: {
  address: string;
  onOpenTransfer: () => void;
  onOpenBusinessWallet: () => void;
}) {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const sender = address as `0x${string}`;
  const balances: Record<StableSymbol, string> = {
    USDT: useTokenBalance(USDT, sender),
    cUSD: useTokenBalance(CUSD, sender),
    USDC: useTokenBalance(USDC, sender),
  };

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{tr("Your profile", "Tu perfil", "Seu perfil")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{tr("Manage your connected wallet and Anna settings.", "Administra tu wallet conectada y la configuración de Anna.", "Gerencie sua carteira conectada e as configurações da Anna.")}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-[var(--muted)]">{tr("Connected wallet", "Wallet conectada", "Carteira conectada")}</p>
        <p className="mt-1 font-mono text-sm" title={address}>{address.slice(0, 6)}…{address.slice(-4)}</p>
        <p className="mt-3 text-xs text-[var(--muted)]">{tr("Balances on Celo", "Balances en Celo", "Saldos na Celo")}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["USDT", "cUSD", "USDC"] as StableSymbol[]).map((symbol) => (
            <div key={symbol} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-[11px] text-[var(--muted)]">{symbol}</p>
              <p className="truncate text-sm font-semibold">{balances[symbol]}</p>
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={onOpenTransfer} className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-left text-white">
        <span className="block font-semibold">{tr("Send tokens", "Enviar tokens", "Enviar tokens")}</span>
        <span className="mt-1 block text-xs text-white/75">{tr("Choose a MiniPay token and transfer it to an external wallet", "Elige un token de MiniPay y transfiérelo a una wallet externa", "Escolha um token do MiniPay e transfira para uma carteira externa")}</span>
      </button>

      <button type="button" onClick={onOpenBusinessWallet} className="rounded-xl border border-white/15 px-4 py-3 text-left text-sm">
        <span className="block font-medium">{tr("Business wallet", "Wallet del negocio", "Carteira do negócio")}</span>
        <span className="mt-1 block text-xs text-[var(--muted)]">{tr("View the separate wallet used by your Anna tools.", "Consulta la wallet separada que usan tus herramientas de Anna.", "Veja a carteira separada usada pelas ferramentas da Anna.")}</span>
      </button>
    </section>
  );
}
