import { NextResponse } from "next/server";

import { redeemAccessCode } from "@/app/lib/accessCodes";
import { rateLimited, clientIp } from "@/app/lib/rateLimit";

// firebase-admin (Firestore txn) needs the Node runtime.
export const runtime = "nodejs";

type Payload = {
  walletAddress: string;
  code: string;
  email: string;
  username: string;
  company?: string;
  website?: string;
};

export async function POST(request: Request) {
  // Unauthenticated (the wallet isn't allowlisted yet) + grants access →
  // throttle hard per IP so codes can't be brute-forced.
  if (rateLimited(`redeem-code:${clientIp(request)}`, 8, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  let body: Partial<Payload>;
  try {
    body = (await request.json()) as Partial<Payload>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const walletAddress =
    typeof body.walletAddress === "string"
      ? body.walletAddress.trim().toLowerCase()
      : undefined;
  const code = typeof body.code === "string" ? body.code.trim() : undefined;
  const email = typeof body.email === "string" ? body.email.trim() : undefined;
  const username =
    typeof body.username === "string" ? body.username.trim() : undefined;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: "Valid walletAddress is required" },
      { status: 400 },
    );
  }
  if (!code) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const result = await redeemAccessCode({
    walletAddress,
    code,
    email,
    username,
    company:
      typeof body.company === "string"
        ? body.company.trim().slice(0, 200) || null
        : null,
    website:
      typeof body.website === "string"
        ? body.website.trim().slice(0, 300) || null
        : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ granted: true });
}
