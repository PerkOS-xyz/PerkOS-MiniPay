import { describe, expect, it } from "vitest";

import { CUSD, USDC, USDT } from "../app/lib/tokenAddresses";
import { selectPaymentToken } from "../app/lib/selectPaymentToken";

describe("selectPaymentToken", () => {
  it("selects the highest user balance that covers the payment", () => {
    expect(
      selectPaymentToken(1, [
        { token: USDT, balance: 2 },
        { token: CUSD, balance: 8 },
        { token: USDC, balance: 4 },
      ]),
    ).toBe(CUSD);
  });

  it("does not select a token whose balance cannot cover the payment", () => {
    expect(
      selectPaymentToken(5, [
        { token: USDT, balance: 4.99 },
        { token: CUSD, balance: 1 },
        { token: USDC, balance: undefined },
      ]),
    ).toBeNull();
  });

  it("rejects invalid payment amounts", () => {
    expect(selectPaymentToken(0, [{ token: USDT, balance: 10 }])).toBeNull();
  });
});
