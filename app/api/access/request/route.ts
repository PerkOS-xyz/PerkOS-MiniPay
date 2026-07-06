import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/app/lib/firebaseAdmin";
import { rateLimited, clientIp } from "@/app/lib/rateLimit";

// firebase-admin needs the Node runtime.
export const runtime = "nodejs";

type Payload = {
  walletAddress: string;
  email: string;
  username?: string;
  company?: string;
  website?: string;
};

/**
 * Public "request access" intake for MiniPay. Writes to the SAME shared
 * Firestore `/access_requests` collection the App uses, tagged `source:"minipay"`
 * so PerkOS-Admin can tell them apart. Status "pending" → an admin approves it
 * in Admin → /access (which writes /allowlist/{wallet}).
 */
export async function POST(request: Request) {
  if (rateLimited(`request-access:${clientIp(request)}`, 3, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
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
  const email = typeof body.email === "string" ? body.email.trim() : undefined;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: "Valid walletAddress is required" },
      { status: 400 },
    );
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  await adminDb()
    .collection("access_requests")
    .add({
      walletAddress,
      email,
      username:
        typeof body.username === "string"
          ? body.username.trim().slice(0, 120) || null
          : null,
      company:
        typeof body.company === "string"
          ? body.company.trim().slice(0, 200) || null
          : null,
      website:
        typeof body.website === "string"
          ? body.website.trim().slice(0, 300) || null
          : null,
      status: "pending",
      source: "minipay",
      createdAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ ok: true });
}
