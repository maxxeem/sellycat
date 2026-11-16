/**
 * Small in-memory sliding-window limiter for public POST endpoints. Per
 * serverless instance (good enough to blunt abuse and loops; the DB-backed
 * comment/reaction limits stay authoritative for those).
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  let lastPrune = 0;
  const prune = (now: number) => {
    if (now - lastPrune < windowMs) return;
    lastPrune = now;
    for (const [key, times] of hits) {
      const kept = times.filter((t) => now - t < windowMs);
      if (kept.length) hits.set(key, kept);
      else hits.delete(key);
    }
  };
  return {
    /** Records a hit and tells whether it is still within the limit. */
    check(key: string, now = Date.now()): { ok: boolean; retryAfterS: number } {
      prune(now);
      const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (times.length >= limit) return { ok: false, retryAfterS: Math.max(1, Math.ceil((windowMs - (now - times[0])) / 1000)) };
      times.push(now);
      hits.set(key, times);
      return { ok: true, retryAfterS: 0 };
    },
  };
}
