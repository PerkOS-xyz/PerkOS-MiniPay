// Minimal in-memory fixed-window rate limiter for the UNAUTHENTICATED access
// routes (request-access + redeem-code). The wallet isn't allowlisted yet, so
// there's no Firebase token to key on — throttle per client IP so access codes
// can't be brute-forced. Per-container (one instance today); good enough here.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns true when the caller is OVER the limit for this window. */
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map can't grow unbounded across IPs.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > max;
}

/** Best-effort client IP behind Caddy (X-Forwarded-For), else a fallback. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
