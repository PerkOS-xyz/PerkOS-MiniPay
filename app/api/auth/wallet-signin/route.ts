import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { base, baseSepolia, celo } from "viem/chains";
import { adminAuth, adminDb } from "@/app/lib/firebaseAdmin";
import { checkWalletAccess } from "@/app/lib/accessControl";

export const runtime = "nodejs";

// Verify against Celo first (MiniPay), then Base for cross-app smart wallets. viem's verifyMessage
// covers both plain EOAs (EIP-191) and ERC-1271 smart-contract wallets per chain.
const clients = [
  createPublicClient({ chain: celo, transport: http() }),
  createPublicClient({ chain: base, transport: http() }),
  createPublicClient({ chain: baseSepolia, transport: http() }),
];

async function verifySignature(input: {
  address: Address;
  message: string;
  signature: Hex;
}): Promise<boolean> {
  for (const client of clients) {
    try {
      if (await client.verifyMessage(input)) return true;
    } catch {
      // try the next chain
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    address?: string;
    nonce?: string;
    signature?: string;
  } | null;

  const address = (body?.address ?? "").toLowerCase();
  const nonce = body?.nonce ?? "";
  const signature = body?.signature ?? "";

  if (!/^0x[a-f0-9]{40}$/.test(address) || !nonce || !/^0x[a-fA-F0-9]+$/.test(signature)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const nonceRef = adminDb().doc(`auth_nonces/${address}/nonces/${nonce}`);
  const snap = await nonceRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Unknown nonce." }, { status: 400 });

  const data = snap.data() as { message: string; expiresAt: string; consumed?: boolean };
  if (data.consumed) return NextResponse.json({ error: "Nonce already used." }, { status: 400 });
  if (new Date(data.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Nonce expired, try again." }, { status: 400 });
  }

  const ok = await verifySignature({
    address: address as Address,
    message: data.message,
    signature: signature as Hex,
  });
  if (!ok) return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });

  if (!(await checkWalletAccess(address))) {
    return NextResponse.json({ error: "This wallet isn't on the access list yet." }, { status: 403 });
  }

  const token = await adminAuth().createCustomToken(address, { walletAddress: address });
  await nonceRef.set({ consumed: true, consumedAt: new Date().toISOString() }, { merge: true });

  return NextResponse.json({ token });
}
