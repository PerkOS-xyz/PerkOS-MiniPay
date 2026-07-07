import { adminDb } from "./firebaseAdmin";

// MiniPay access cascade: public mode → env allowlist → Firestore
// /minipay_allowlist/{addr}. MiniPay has its OWN allowlist, SEPARATE from the
// App's /allowlist — a wallet can have MiniPay access without App access and
// vice versa (Julio 2026-07-06). Curated in PerkOS-Admin → MiniPay → Access.
// The env `PERKOS_PUBLIC_MODE` short-circuit still opens MiniPay to everyone.

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
    // Per-surface public mode: MiniPay reads its own `publicModeMinipay` flag
    // when set, falling back to the legacy global `publicMode`. This is what
    // lets the Admin open/close MiniPay INDEPENDENTLY of the App (which reads
    // `publicModeApp`). The `PERKOS_PUBLIC_MODE` env above still force-opens.
    const d = cfg.data();
    const mpVal = d?.publicModeMinipay;
    if ((typeof mpVal === "boolean" ? mpVal : d?.publicMode) === true) {
      return true;
    }
  } catch {
    // fall through
  }

  try {
    // MiniPay-only allowlist (NOT the App's /allowlist — independent by design).
    const doc = await adminDb().doc(`minipay_allowlist/${addr}`).get();
    if (doc.exists && doc.data()?.suspended !== true) return true;
  } catch {
    // fall through
  }

  return false;
}
