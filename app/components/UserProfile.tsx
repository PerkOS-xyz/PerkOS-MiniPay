"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { celo } from "wagmi/chains";

import { translated, useLanguage } from "../lib/i18n";
import { usePayCusd } from "../lib/usePayCusd";
import { useMiniPayHost } from "../lib/useIsMiniPay";
import { CUSD, USDC, USDT, type TokenInfo } from "../lib/tokenAddresses";
import {
  validateExternalTransfer,
  type TransferValidationError,
} from "../lib/transferValidation";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

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
  return {
    raw,
    display: raw === undefined ? "—" : Number(formatUnits(raw, token.decimals)).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    }),
    refetch: result.refetch,
  };
}

export function UserProfile({
  address,
  onOpenBusinessWallet,
}: {
  address: string;
  onOpenBusinessWallet: () => void;
}) {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const sender = address as `0x${string}`;
  const isMiniPay = useMiniPayHost();
  const { pay, ready } = usePayCusd();
  const usdt = useTokenBalance(USDT, sender);
  const cusd = useTokenBalance(CUSD, sender);
  const usdc = useTokenBalance(USDC, sender);
  const balances = { USDT: usdt, cUSD: cusd, USDC: usdc };

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<"edit" | "review" | "sending" | "sent">("edit");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);

  const token = USDT;
  const balance = usdt;

  function validationMessage(code: TransferValidationError): string {
    switch (code) {
      case "invalid-recipient":
        return tr("Enter a valid external wallet address.", "Ingresa una wallet externa válida.", "Insira uma carteira externa válida.");
      case "self-transfer":
        return tr("Use a wallet different from your connected wallet.", "Usa una wallet diferente a la wallet conectada.", "Use uma carteira diferente da carteira conectada.");
      case "invalid-amount":
        return tr("Enter an amount greater than zero.", "Ingresa un monto mayor que cero.", "Insira um valor maior que zero.");
      case "too-many-decimals":
        return tr(`Use no more than ${token.decimals} decimal places.`, `Usa máximo ${token.decimals} decimales.`, `Use no máximo ${token.decimals} casas decimais.`);
      case "insufficient-balance":
        return tr("You do not have enough USDT.", "No tienes suficiente USDT.", "Você não tem USDT suficiente.");
      case "fee-reserve":
        return tr("Leave a small amount for the network fee.", "Deja una pequeña cantidad para la comisión de red.", "Deixe uma pequena quantia para a taxa de rede.");
    }
  }

  function validate() {
    const result = validateExternalTransfer({
      sender,
      recipient,
      amount,
      decimals: token.decimals,
      balance: balance.raw,
    });
    if (result.error) {
      setError(validationMessage(result.error));
      return null;
    }
    setError(null);
    return result.value!;
  }

  function reviewTransfer() {
    if (validate()) setStage("review");
  }

  async function sendTransfer() {
    const valid = validate();
    if (!valid) {
      setStage("edit");
      return;
    }
    setStage("sending");
    try {
      const txHash = await pay(valid.recipient, amount.trim(), USDT);
      setHash(txHash);
      setStage("sent");
      setTimeout(() => {
        usdt.refetch();
        cusd.refetch();
        usdc.refetch();
      }, 5000);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : tr("The transfer was not sent.", "La transferencia no fue enviada.", "A transferência não foi enviada."),
      );
      setStage("review");
    }
  }

  function resetTransfer() {
    setRecipient("");
    setAmount("");
    setHash(null);
    setError(null);
    setStage("edit");
  }

  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{tr("Your profile", "Tu perfil", "Seu perfil")}</h1>
        <p className="text-sm text-[var(--muted)]">
          {tr("Manage your connected wallet and move your own tokens.", "Administra tu wallet conectada y mueve tus propios tokens.", "Gerencie sua carteira conectada e mova seus próprios tokens.")}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-[var(--muted)]">{tr("Connected wallet", "Wallet conectada", "Carteira conectada")}</p>
        <p className="mt-1 font-mono text-sm" title={address}>{shortAddress}</p>
        <p className="mt-3 text-xs text-[var(--muted)]">{tr("Balances on Celo", "Balances en Celo", "Saldos na Celo")}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["USDT", "cUSD", "USDC"] as StableSymbol[]).map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-[11px] text-[var(--muted)]">{item}</p>
              <p className="truncate text-sm font-semibold">{balances[item].display}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold">{tr("Send USDT from MiniPay", "Enviar USDT desde MiniPay", "Enviar USDT pelo MiniPay")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          {tr("USDT is sent on Celo from your connected MiniPay wallet. Transfers cannot be reversed.", "El USDT se envía por Celo desde tu wallet conectada de MiniPay. Las transferencias no se pueden revertir.", "O USDT é enviado pela Celo a partir da sua carteira MiniPay conectada. As transferências não podem ser revertidas.")}
        </p>

        {isMiniPay === false && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <p className="font-medium">{tr("Open Anna in MiniPay", "Abre Anna en MiniPay", "Abra a Anna no MiniPay")}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {tr("For your security, this USDT transfer uses only the wallet connected by MiniPay.", "Por tu seguridad, esta transferencia de USDT usa únicamente la wallet conectada por MiniPay.", "Para sua segurança, esta transferência de USDT usa somente a carteira conectada pelo MiniPay.")}
            </p>
          </div>
        )}

        {isMiniPay === true && stage === "edit" && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
              <span className="text-[var(--muted)]">{tr("Token and network", "Token y red", "Token e rede")}</span>
              <span className="ml-2 font-semibold">USDT · Celo</span>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span>{tr("External wallet", "Wallet externa", "Carteira externa")}</span>
              <input
                aria-label={tr("External wallet address", "Dirección de wallet externa", "Endereço da carteira externa")}
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  setError(null);
                }}
                placeholder="0x…"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 rounded-xl border border-white/15 bg-black/25 px-3 font-mono text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{tr("Amount", "Monto", "Valor")}</span>
              <input
                aria-label={tr("Amount to send", "Monto a enviar", "Valor para enviar")}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="0.00"
                className="h-12 rounded-xl border border-white/15 bg-black/25 px-3 text-base"
              />
              <span className="text-xs text-[var(--muted)]">
                {tr("Available", "Disponible", "Disponível")}: {balance.display} USDT
              </span>
            </label>
            <button
              type="button"
              onClick={reviewTransfer}
              disabled={!ready || balance.raw === undefined}
              className="h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-white disabled:opacity-50"
            >
              {tr("Review transfer", "Revisar transferencia", "Revisar transferência")}
            </button>
          </div>
        )}

        {isMiniPay === true && (stage === "review" || stage === "sending") && (
          <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
            <p className="text-sm font-semibold">{tr("Confirm the details", "Confirma los datos", "Confirme os dados")}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-[var(--muted)]">{tr("Network", "Red", "Rede")}</dt><dd className="text-right">Celo</dd>
              <dt className="text-[var(--muted)]">{tr("You send", "Envías", "Você envia")}</dt><dd className="text-right font-semibold">{amount} USDT</dd>
              <dt className="text-[var(--muted)]">{tr("To", "A", "Para")}</dt><dd className="break-all text-right font-mono text-xs">{recipient}</dd>
            </dl>
            <p className="mt-3 text-xs text-amber-100/80">
              {tr("The final amount and network fee will appear in MiniPay before you approve.", "El monto final y la comisión aparecerán en MiniPay antes de aprobar.", "O valor final e a taxa aparecerão no MiniPay antes da aprovação.")}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStage("edit")}
                disabled={stage === "sending"}
                className="h-12 rounded-xl border border-white/15 disabled:opacity-50"
              >
                {tr("Edit", "Editar", "Editar")}
              </button>
              <button
                type="button"
                onClick={sendTransfer}
                disabled={stage === "sending"}
                className="h-12 rounded-xl bg-[var(--accent)] px-3 font-medium text-white disabled:opacity-50"
              >
                {stage === "sending"
                  ? tr("Waiting for MiniPay…", "Esperando MiniPay…", "Aguardando MiniPay…")
                  : tr("Confirm and open MiniPay", "Confirmar y abrir MiniPay", "Confirmar e abrir MiniPay")}
              </button>
            </div>
          </div>
        )}

        {stage === "sent" && hash && (
          <div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-300/5 p-4">
            <p className="font-semibold text-emerald-100">{tr("Transfer submitted", "Transferencia enviada", "Transferência enviada")}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {tr("You can follow its confirmation on Celoscan.", "Puedes seguir su confirmación en Celoscan.", "Você pode acompanhar a confirmação no Celoscan.")}
            </p>
            <a
              href={`https://celoscan.io/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-[var(--accent)] underline"
            >
              {tr("View transaction", "Ver transacción", "Ver transação")}
            </a>
            <button type="button" onClick={resetTransfer} className="mt-4 block text-sm text-[var(--muted)] underline">
              {tr("Send another", "Enviar otra", "Enviar outra")}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-xs text-red-200">{error}</p>}
      </div>

      <button
        type="button"
        onClick={onOpenBusinessWallet}
        className="rounded-xl border border-white/15 px-4 py-3 text-left text-sm"
      >
        <span className="block font-medium">{tr("Business wallet", "Wallet del negocio", "Carteira do negócio")}</span>
        <span className="mt-1 block text-xs text-[var(--muted)]">
          {tr("View the separate wallet used by your Anna tools.", "Consulta la wallet separada que usan tus herramientas de Anna.", "Veja a carteira separada usada pelas ferramentas da Anna.")}
        </span>
      </button>
    </section>
  );
}
