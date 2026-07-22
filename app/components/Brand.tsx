import { AnnaAvatar } from "./AnnaAvatar";

/** Anna is the product; PerkOS is the quiet endorsement. */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="Anna by PerkOS">
      <AnnaAvatar size="sm" state="resting" decorative />
      <span className="flex flex-col items-start leading-none">
        <span className="text-lg font-semibold tracking-tight">Anna</span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          by PerkOS
        </span>
      </span>
    </div>
  );
}
