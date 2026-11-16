import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit per window, then refuses with a retry hint", () => {
    const l = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const t0 = 1_000_000;
    expect(l.check("a", t0).ok).toBe(true);
    expect(l.check("a", t0 + 1000).ok).toBe(true);
    expect(l.check("a", t0 + 2000).ok).toBe(true);
    const refused = l.check("a", t0 + 3000);
    expect(refused).toEqual({ ok: false, retryAfterS: 57 });
    expect(l.check("b", t0 + 3000).ok).toBe(true); // other key unaffected
    expect(l.check("a", t0 + 60_001).ok).toBe(true); // window slid
  });
});
