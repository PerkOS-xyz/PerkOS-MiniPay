import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { adminDb } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

const NONCE_TTL_MS = 5 * 60 * 1000;

function buildMessage(address: string, nonce: string, issuedAt: string): string {
  return [
    "PerkOS wants to sign you in.",
    "",
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    "",
    "Signing this is free and does not authorize any transaction.",
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const address = (req.nextUrl.searchParams.get("address") ?? "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);
  const message = buildMessage(address, nonce, issuedAt.toISOString());

  await adminDb()
    .doc(`auth_nonces/${address}/nonces/${nonce}`)
    .set({
      address,
      nonce,
      message,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      consumed: false,
    });

  return NextResponse.json({ nonce, message, expiresAt: expiresAt.toISOString() });
}
