/* eslint-disable @next/next/no-img-element */

/** The PerkOS wordmark. Used in the app header so the Mini App reads as PerkOS-branded
 *  (a MiniPay listing requirement: show your own name/logo, not MiniPay-operated). */
export function Brand({ className = "h-7 w-auto" }: { className?: string }) {
  return <img src="/perkos-header.png" alt="PerkOS" className={className} />;
}
