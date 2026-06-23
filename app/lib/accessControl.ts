import { adminDb } from "./firebaseAdmin";

// Mirrors the PerkOS access cascade: public mode → env allowlist → Firestore /allowlist/{addr}.
// For the MiniPay launch the plan is PUBLIC mode (open to MiniPay's retail audience), so a
// `PERKOS_PUBLIC_MODE=true` env short-circuit is supported for this build.

export async function checkWalletAccess(address: string): Promise<boolean> {
  const addr = address.toLowerCase();

  if (process.env.PERKOS_PUBLIC_MODE === "true") return true;

  const envList = (process.env.PERKOS_WHITELIST ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envList.includes(addr)) return true;

  try {
    const cfg = await adminDb().doc("config/access").get();
    if (cfg.exists && cfg.data()?.publicMode === true) return true;
  } catch {
    // fall through
  }

  try {
    const doc = await adminDb().doc(`allowlist/${addr}`).get();
    if (doc.exists && doc.data()?.suspended !== true) return true;
  } catch {
    // fall through
  }

  return false;
}
