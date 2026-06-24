/* eslint-disable @next/next/no-img-element */

/** PerkOS brand lockup: the crisp square mark + the wordmark in the app font.
 *  (The rough perkos-header.png wordmark didn't render well on dark.)
 *  `className` styles the row container (e.g. "justify-center"). */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
      <span className="text-lg font-semibold tracking-tight">PerkOS</span>
    </div>
  );
}
