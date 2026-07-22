import { describe, expect, it, vi } from "vitest";
import type { WalletClient } from "viem";

import { BROWSER_CHAIN_IDS } from "../app/lib/browserChains";
import { browserPaymentRail } from "../app/lib/paymentRails";
import { signX402Payment, type PaymentRequirements } from "../app/lib/x402Payment";

describe("browser payment rails", () => {
  it("maps Base to native USDC and Robinhood to canonical USDG", () => {
    expect(browserPaymentRail(BROWSER_CHAIN_IDS.base)).toMatchObject({
      network: "base",
      token: { symbol: "USDC", decimals: 6, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    });
    expect(browserPaymentRail(BROWSER_CHAIN_IDS.robinhood)).toMatchObject({
      network: "robinhood",
      token: { symbol: "USDG", decimals: 6, address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" },
    });
    expect(browserPaymentRail(BROWSER_CHAIN_IDS.celo)).toBeNull();
  });

  it("signs the USDG EIP-3009 domain and encodes an x402 payload", async () => {
    const signTypedData = vi.fn(async () => `0x${"11".repeat(65)}` as `0x${string}`);
    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: "robinhood",
      maxAmountRequired: "250000",
      payTo: "0x1111111111111111111111111111111111111111",
      asset: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      maxTimeoutSeconds: 120,
      extra: { name: "Global Dollar", version: "1" },
    };
    const encoded = await signX402Payment({
      walletClient: { signTypedData } as unknown as WalletClient,
      requirements,
      payer: "0x2222222222222222222222222222222222222222",
      chainId: 4663,
    });
    expect(signTypedData).toHaveBeenCalledWith(expect.objectContaining({
      domain: expect.objectContaining({ name: "Global Dollar", version: "1", chainId: 4663 }),
      primaryType: "TransferWithAuthorization",
    }));
    const payload = JSON.parse(atob(encoded));
    expect(payload).toMatchObject({
      x402Version: 1,
      scheme: "exact",
      network: "robinhood",
      payload: { authorization: { value: "250000" } },
    });
  });
});
