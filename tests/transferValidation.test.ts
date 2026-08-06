import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";

import { validateExternalTransfer } from "../app/lib/transferValidation";

const sender = "0x63be16caf777ef8e815b948fb4760e6823de93b6";
const recipient = "0x499d000000000000000000000000000000000daf";

describe("external transfer validation", () => {
  it("normalizes a valid recipient and parses token decimals exactly", () => {
    const result = validateExternalTransfer({
      sender,
      recipient,
      amount: "1.25",
      decimals: 6,
      balance: parseUnits("5", 6),
    });
    expect(result.error).toBeUndefined();
    expect(result.value?.recipient.toLowerCase()).toBe(recipient.toLowerCase());
    expect(result.value?.amountUnits).toBe(1_250_000n);
  });

  it.each([
    ["bad address", "1", "invalid-recipient"],
    [sender, "1", "self-transfer"],
    [recipient, "0", "invalid-amount"],
    [recipient, "1e2", "invalid-amount"],
    [recipient, "1.0000001", "too-many-decimals"],
  ])("rejects recipient %s with amount %s", (to, amount, error) => {
    expect(
      validateExternalTransfer({
        sender,
        recipient: to,
        amount,
        decimals: 6,
        balance: parseUnits("5", 6),
      }).error,
    ).toBe(error);
  });

  it("rejects an amount above the live token balance", () => {
    expect(
      validateExternalTransfer({
        sender,
        recipient,
        amount: "6",
        decimals: 6,
        balance: parseUnits("5", 6),
      }).error,
    ).toBe("insufficient-balance");
  });

  it("requires a fee reserve when the entire token balance is selected", () => {
    expect(
      validateExternalTransfer({
        sender,
        recipient,
        amount: "5",
        decimals: 6,
        balance: parseUnits("5", 6),
      }).error,
    ).toBe("fee-reserve");
  });
});
