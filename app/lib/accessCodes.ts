import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/app/lib/firebaseAdmin";

/**
 * Access codes = referral/partner codes an "impulsor" (promoter) hands to the
 * users they onboard. Redeeming a valid code grants the wallet instant access
 * (writes /allowlist/{wallet}) instead of the pending request-access flow, and
 * bumps the code's usage counter so the admin can track each promoter's signups.
 *
 * Ported verbatim from PerkOS/app/lib/accessCodes.ts so MiniPay reuses the SAME
 * shared Firestore collections (project perkos-app) and stays consistent with
 * PerkOS-Admin's curation. Only the adminDb import differs.
 *
 * Firestore:
 *   /access_codes/{CODE}                       { code, promoter, active, usageCount, maxUses?, ... }
 *   /access_codes/{CODE}/redemptions/{wallet}  { wallet, email, username, company?, website?, redeemedAt }
 *   /allowlist/{wallet}                        { source:"access-code", accessCode, promoter, email, username, createdAt }
 *   /usernames/{username}                      { wallet }   (shared uniqueness registry)
 *   /wallets/{wallet}/profile/main             { username, updatedAt }
 */

/** Codes are case-insensitive, stored uppercase without inner whitespace. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Same rules as the @-mention username registry: 3-20 chars, [a-z0-9_-]. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}
export function isValidUsername(raw: string): boolean {
  return /^[a-z0-9_-]{3,20}$/.test(normalizeUsername(raw));
}

class RedeemError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Validate + redeem an access code for a wallet, transactionally. On success
 * the wallet is allowlisted, the username is claimed, a redemption row is
 * written, and the code's usageCount is incremented (once per wallet).
 */
export async function redeemAccessCode(input: {
  walletAddress: string;
  code: string;
  email: string;
  username: string;
  company?: string | null;
  website?: string | null;
}): Promise<RedeemResult> {
  const wallet = input.walletAddress.trim().toLowerCase();
  const code = normalizeCode(input.code);
  const username = normalizeUsername(input.username);

  if (!isValidUsername(username)) {
    return {
      ok: false,
      status: 400,
      error: "Username must be 3-20 chars: letters, numbers, _ or -.",
    };
  }

  const db = adminDb();
  const codeRef = db.collection("access_codes").doc(code);
  const usernameRef = db.collection("usernames").doc(username);
  const allowlistRef = db.collection("allowlist").doc(wallet);
  const profileRef = db
    .collection("wallets")
    .doc(wallet)
    .collection("profile")
    .doc("main");
  const redemptionRef = codeRef.collection("redemptions").doc(wallet);

  try {
    await db.runTransaction(async (tx) => {
      // --- reads first (Firestore txn rule) ---
      const codeSnap = await tx.get(codeRef);
      if (!codeSnap.exists) {
        throw new RedeemError(400, "That access code isn't valid.");
      }
      const cdata = codeSnap.data() as {
        active?: boolean;
        usageCount?: number;
        maxUses?: number | null;
        promoter?: string | null;
      };
      if (cdata.active === false) {
        throw new RedeemError(400, "That access code is no longer active.");
      }
      const usageCount = cdata.usageCount ?? 0;
      if (
        cdata.maxUses != null &&
        cdata.maxUses > 0 &&
        usageCount >= cdata.maxUses
      ) {
        throw new RedeemError(400, "That access code has reached its limit.");
      }

      const unameSnap = await tx.get(usernameRef);
      if (
        unameSnap.exists &&
        (unameSnap.data() as { wallet?: string }).wallet !== wallet
      ) {
        throw new RedeemError(409, "That username is already taken.");
      }
      const alreadyRedeemed = (await tx.get(redemptionRef)).exists;

      // --- writes ---
      tx.set(
        allowlistRef,
        {
          source: "access-code",
          accessCode: code,
          promoter: cdata.promoter ?? null,
          email: input.email,
          username,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.set(usernameRef, { wallet });
      tx.set(
        profileRef,
        { username, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      tx.set(
        redemptionRef,
        {
          wallet,
          email: input.email,
          username,
          company: input.company ?? null,
          website: input.website ?? null,
          redeemedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      // Count each wallet once, even if it somehow re-submits.
      if (!alreadyRedeemed) {
        tx.set(codeRef, { usageCount: FieldValue.increment(1) }, { merge: true });
      }
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof RedeemError) {
      return { ok: false, error: e.message, status: e.status };
    }
    return { ok: false, error: "Could not redeem the access code.", status: 500 };
  }
}
