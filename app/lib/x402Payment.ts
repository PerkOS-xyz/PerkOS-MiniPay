import { getAddress, type WalletClient } from "viem";

export type PaymentRequirements = {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
  extra?: { name?: string; version?: string };
};

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

function randomNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export async function signX402Payment(input: {
  walletClient: WalletClient;
  requirements: PaymentRequirements;
  payer: `0x${string}`;
  chainId: number;
}): Promise<string> {
  const { walletClient, requirements, payer, chainId } = input;
  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + (requirements.maxTimeoutSeconds || 120));
  const nonce = randomNonce();
  const value = BigInt(requirements.maxAmountRequired);
  const authorization = {
    from: getAddress(payer),
    to: getAddress(requirements.payTo),
    value,
    validAfter,
    validBefore,
    nonce,
  };
  const signature = await (walletClient.signTypedData as (args: unknown) => Promise<`0x${string}`>)({
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    domain: {
      name: requirements.extra?.name || "USDC",
      version: requirements.extra?.version || "2",
      chainId,
      verifyingContract: getAddress(requirements.asset),
    },
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });
  return btoa(JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: requirements.network,
    payload: {
      signature,
      authorization: {
        from: authorization.from,
        to: authorization.to,
        value: value.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  }));
}
