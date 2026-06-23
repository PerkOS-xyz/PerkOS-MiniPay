"use client";

import { useIsMiniPay } from "./lib/useIsMiniPay";
import { useWalletSession, type WalletSessionStatus } from "./lib/useWalletSession";
import { Home } from "./components/Home";

export default function Page() {
  const isMiniPay = useIsMiniPay();
  const { status, address, error } = useWalletSession();

  if (status === "signed-in" && address) {
    return <Home address={address} />;
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Your AI team</h1>
      <p className="text-sm text-[var(--muted)]">
        A coworking of agents for your small business — on Celo, in MiniPay.
      </p>
      <StatusLine status={status} isMiniPay={isMiniPay} error={error} />
    </main>
  );
}

function StatusLine({
  status,
  isMiniPay,
  error,
}: {
  status: WalletSessionStatus;
  isMiniPay: boolean;
  error: string | null;
}) {
  let text: string;
  if (status === "not-allowlisted") {
    text = "This wallet isn't on the access list yet.";
  } else if (status === "error") {
    text = error ?? "Something went wrong. Try again.";
  } else if (status === "syncing" || status === "loading") {
    text = "Connecting your wallet…";
  } else if (isMiniPay) {
    text = "Connecting your wallet…";
  } else {
    text = "Open this app inside MiniPay to start.";
  }
  return <p className="mt-2 text-xs text-[var(--muted)]">{text}</p>;
}
