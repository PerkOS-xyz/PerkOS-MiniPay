import { getAddress, isAddress, parseUnits } from "viem";

export type TransferValidationError =
  | "invalid-recipient"
  | "self-transfer"
  | "invalid-amount"
  | "too-many-decimals"
  | "insufficient-balance"
  | "fee-reserve";

export type ValidTransfer = {
  recipient: `0x${string}`;
  amountUnits: bigint;
};

export function validateExternalTransfer(input: {
  sender: string;
  recipient: string;
  amount: string;
  decimals: number;
  balance: bigint | undefined;
}): { value?: ValidTransfer; error?: TransferValidationError } {
  const recipient = input.recipient.trim();
  if (!isAddress(recipient)) return { error: "invalid-recipient" };
  if (recipient.toLowerCase() === input.sender.toLowerCase()) {
    return { error: "self-transfer" };
  }

  const amount = input.amount.trim();
  if (!/^\d+(?:\.\d+)?$/.test(amount)) return { error: "invalid-amount" };
  const fraction = amount.split(".")[1] ?? "";
  if (fraction.length > input.decimals) return { error: "too-many-decimals" };

  let amountUnits: bigint;
  try {
    amountUnits = parseUnits(amount, input.decimals);
  } catch {
    return { error: "invalid-amount" };
  }
  if (amountUnits <= 0n) return { error: "invalid-amount" };
  if (input.balance === undefined || amountUnits > input.balance) {
    return { error: "insufficient-balance" };
  }
  // MiniPay pays Celo gas in the token being sent. Do not let the form suggest
  // that the entire displayed balance can be transferred successfully.
  if (amountUnits === input.balance) return { error: "fee-reserve" };

  return {
    value: {
      recipient: getAddress(recipient),
      amountUnits,
    },
  };
}
