"use client";

import { useIsMiniPay } from "./lib/useIsMiniPay";
import { useWalletSession, type WalletSessionStatus } from "./lib/useWalletSession";
import { Home } from "./components/Home";
import { Brand } from "./components/Brand";
import { ConnectButton } from "./components/ConnectButton";

export default function Page() {
  const isMiniPay = useIsMiniPay();
  const { status, address, error, isConnected } = useWalletSession();

  if (status === "signed-in" && address) {
    return <Home address={address} />;
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Brand className="mb-2 justify-center" />
      <h1 className="text-2xl font-semibold">Your AI team</h1>
      <p className="text-sm text-[var(--muted)]">
        A coworking of agents for your small business — on Celo, in MiniPay.
      </p>
      <GateAction status={status} isMiniPay={isMiniPay} isConnected={isConnected} error={error} />
    </main>
  );
}

function GateAction({
  status,
  isMiniPay,
  isConnected,
  error,
}: {
  status: WalletSessionStatus;
  isMiniPay: boolean;
  isConnected: boolean;
  error: string | null;
}) {
  const note = (text: string, danger = false) => (
    <p className={`mt-2 max-w-xs text-xs ${danger ? "text-red-300" : "text-[var(--muted)]"}`}>{text}</p>
  );

  if (status === "not-allowlisted") return note("This wallet isn't on the access list yet.");
  if (status === "error") return note(`Sign-in failed: ${error ?? "unknown error"}`, true);
  if (isConnected || status === "syncing") {
    return note(isMiniPay ? "Signing you in… approve the request in MiniPay." : "Signing you in…");
  }
  if (isMiniPay) return note("Connecting your wallet…");
  // Regular browser: connection isn't implicit — let the tester connect a wallet.
  return (
    <div className="mt-3">
      <ConnectButton />
    </div>
  );
}
