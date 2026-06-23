import { signInWithCustomToken, type User } from "firebase/auth";
import { firebaseAuth } from "./firebase";

// SIWE-style sign-in against our own /api/auth routes → Firebase custom token.
// MiniPay signs the message with personal_sign; the server verifies (EOA or ERC-1271 on Celo)
// and mints a Firebase custom token whose uid is the wallet address.

export async function signInWithWallet(input: {
  address: string;
  signMessage: (message: string) => Promise<string>;
}): Promise<User> {
  const address = input.address.toLowerCase();

  const nonceRes = await fetch(`/api/auth/nonce?address=${encodeURIComponent(address)}`);
  if (!nonceRes.ok) {
    const { error } = (await nonceRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Couldn't request a sign-in nonce.");
  }
  const { nonce, message } = (await nonceRes.json()) as { nonce: string; message: string };

  const signature = await input.signMessage(message);

  const exchangeRes = await fetch("/api/auth/wallet-signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, nonce, signature }),
  });
  if (!exchangeRes.ok) {
    const { error } = (await exchangeRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Sign-in rejected by server.");
  }
  const { token } = (await exchangeRes.json()) as { token: string };

  const credential = await signInWithCustomToken(firebaseAuth(), token);
  return credential.user;
}
