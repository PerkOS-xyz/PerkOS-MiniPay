"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";

import { translated, useLanguage } from "../lib/i18n";
import { useMiniPayHost } from "../lib/useIsMiniPay";
import { usePayCusd } from "../lib/usePayCusd";
import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";
import { validateExternalTransfer, type TransferValidationError } from "../lib/transferValidation";

const ERC20_BALANCE_ABI = [{
  type: "function",
  name: "balanceOf",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

type StableSymbol = "USDT" | "cUSD" | "USDC";

const TOKENS: Record<StableSymbol, TokenInfo> = {
  USDT,
  cUSD: CUSD,
  USDC,
};

function useTokenBalance(token: TokenInfo, account: `0x${string}`) {
  const query = useReadContract({
    address: token.address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [account],
    chainId: celo.id,
  });
  const raw = query.data as bigint | undefined;
  return {
    raw,
    display: raw === undefined
      ? "—"
      : Number(formatUnits(raw, token.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 }),
    refetch: query.refetch,
  };
}

export function ExternalTransfer({ address }: { address: string }) {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const sender = address as `0x${string}`;
  const isMiniPay = useMiniPayHost();
  const { pay, ready } = usePayCusd();
  const usdt = useTokenBalance(USDT, sender);
  const cusd = useTokenBalance(CUSD, sender);
  const usdc = useTokenBalance(USDC, sender);
  const balances = { USDT: usdt, cUSD: cusd, USDC: usdc };

  const [symbol, setSymbol] = useState<StableSymbol>("USDT");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<"edit" | "review" | "sending" | "sent">("edit");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const token = TOKENS[symbol];
  const balance = balances[symbol];

  function message(code: TransferValidationError) {
    switch (code) {
      case "invalid-recipient": return tr("Enter a valid external wallet address.", "Ingresa una wallet externa válida.", "Insira uma carteira externa válida.");
      case "self-transfer": return tr("Use a wallet different from your MiniPay wallet.", "Usa una wallet diferente a tu wallet de MiniPay.", "Use uma carteira diferente da sua carteira MiniPay.");
      case "invalid-amount": return tr("Enter an amount greater than zero.", "Ingresa un monto mayor que cero.", "Insira um valor maior que zero.");
      case "too-many-decimals": return tr(`${symbol} supports up to ${token.decimals} decimal places.`, `${symbol} admite máximo ${token.decimals} decimales.`, `${symbol} aceita no máximo ${token.decimals} casas decimais.`);
      case "insufficient-balance": return tr(`You do not have enough ${symbol}.`, `No tienes suficiente ${symbol}.`, `Você não tem ${symbol} suficiente.`);
      case "fee-reserve": return tr("Leave a small amount for the network fee.", "Deja una pequeña cantidad para la comisión de red.", "Deixe uma pequena quantia para a taxa de rede.");
    }
  }

  function validate() {
    const result = validateExternalTransfer({ sender, recipient, amount, decimals: token.decimals, balance: balance.raw });
    if (result.error) {
      setError(message(result.error));
      return null;
    }
    setError(null);
    return result.value!;
  }

  async function send() {
    const valid = validate();
    if (!valid) return setStage("edit");
    setStage("sending");
    try {
      setHash(await pay(valid.recipient, amount.trim(), token));
      setStage("sent");
      setTimeout(() => {
        usdt.refetch();
        cusd.refetch();
        usdc.refetch();
      }, 5000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr("The transfer was not sent.", "La transferencia no fue enviada.", "A transferência não foi enviada."));
      setStage("review");
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">{tr("Celo tokens", "Tokens en Celo", "Tokens na Celo")}</p>
        <h1 className="mt-1 text-2xl font-semibold">{tr("Send to an external wallet", "Enviar a una wallet externa", "Enviar para uma carteira externa")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {tr("The funds leave your MiniPay wallet. Check every detail because transfers cannot be reversed.", "Los fondos salen de tu wallet de MiniPay. Verifica cada dato porque la transferencia no se puede revertir.", "Os fundos saem da sua carteira MiniPay. Confira todos os dados porque a transferência não pode ser revertida.")}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">{tr("Selected balance", "Balance seleccionado", "Saldo selecionado")}</p>
            <p className="mt-1 text-xl font-semibold">{balance.display} {symbol}</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs">Celo</span>
        </div>
        <p className="mt-3 break-all font-mono text-[11px] text-[var(--muted)]">{address}</p>
      </div>

      {isMiniPay === false ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-medium">{tr("Open Anna in MiniPay", "Abre Anna en MiniPay", "Abra a Anna no MiniPay")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{tr("This screen only uses the wallet connected by MiniPay.", "Esta pantalla usa únicamente la wallet conectada por MiniPay.", "Esta tela usa somente a carteira conectada pelo MiniPay.")}</p>
        </div>
      ) : stage === "edit" ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{tr("Token to send", "Token a enviar", "Token para enviar")}</span>
            <select aria-label={tr("Token to send", "Token a enviar", "Token para enviar")} value={symbol} onChange={(event) => { setSymbol(event.target.value as StableSymbol); setError(null); }} className="h-12 rounded-xl border border-white/15 bg-black/25 px-3">
              <option value="USDT">USDT — {usdt.display}</option>
              <option value="cUSD">cUSD / USDm — {cusd.display}</option>
              <option value="USDC">USDC — {usdc.display}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{tr("Destination wallet", "Wallet de destino", "Carteira de destino")}</span>
            <input aria-label={tr("Destination wallet", "Wallet de destino", "Carteira de destino")} value={recipient} onChange={(event) => { setRecipient(event.target.value); setError(null); }} placeholder="0x…" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-12 rounded-xl border border-white/15 bg-black/25 px-3 font-mono text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{tr("Amount", "Monto", "Valor")} ({symbol})</span>
            <input aria-label={tr("Amount to send", "Monto a enviar", "Valor para enviar")} value={amount} onChange={(event) => { setAmount(event.target.value); setError(null); }} inputMode="decimal" placeholder="0.00" className="h-12 rounded-xl border border-white/15 bg-black/25 px-3 text-base" />
          </label>
          <button type="button" onClick={() => { if (validate()) setStage("review"); }} disabled={!ready || balance.raw === undefined} className="h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-white disabled:opacity-50">
            {tr("Review transfer", "Revisar transferencia", "Revisar transferência")}
          </button>
        </div>
      ) : stage === "review" || stage === "sending" ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4">
          <h2 className="font-semibold">{tr("Review before signing", "Revisa antes de firmar", "Revise antes de assinar")}</h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className="text-[var(--muted)]">{tr("From", "Desde", "De")}</dt><dd className="break-all text-right font-mono text-xs">{address}</dd>
            <dt className="text-[var(--muted)]">{tr("To", "Hacia", "Para")}</dt><dd className="break-all text-right font-mono text-xs">{recipient}</dd>
            <dt className="text-[var(--muted)]">{tr("You send", "Envías", "Você envia")}</dt><dd className="text-right font-semibold">{amount} {symbol}</dd>
            <dt className="text-[var(--muted)]">{tr("Network", "Red", "Rede")}</dt><dd className="text-right">Celo</dd>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStage("edit")} disabled={stage === "sending"} className="h-12 rounded-xl border border-white/15 disabled:opacity-50">{tr("Edit", "Editar", "Editar")}</button>
            <button type="button" onClick={send} disabled={stage === "sending"} className="h-12 rounded-xl bg-[var(--accent)] px-3 font-medium text-white disabled:opacity-50">{stage === "sending" ? tr("Waiting for MiniPay…", "Esperando MiniPay…", "Aguardando MiniPay…") : tr("Open MiniPay to sign", "Abrir MiniPay para firmar", "Abrir MiniPay para assinar")}</button>
          </div>
        </div>
      ) : hash ? (
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/5 p-4">
          <h2 className="font-semibold text-emerald-100">{tr("Transfer submitted", "Transferencia enviada", "Transferência enviada")}</h2>
          <a href={`https://celoscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[var(--accent)] underline">{tr("View on Celoscan", "Ver en Celoscan", "Ver no Celoscan")}</a>
        </div>
      ) : null}

      {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    </section>
  );
}
