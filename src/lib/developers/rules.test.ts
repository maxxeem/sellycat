import { describe, expect, it } from "vitest";
import { bearer, cleanWebhookUrl, hashKey, keyPrefix, looksLikeKey, MAX_ATTEMPTS, newApiKey, newWebhookSecret, nextAttempt, parseLimit, parseTime, signature, verifySignature } from "./rules";

describe("api keys", () => {
  it("creates distinct keys with a recognisable prefix", () => {
    const a = newApiKey();
    const b = newApiKey();
    expect(a).not.toBe(b);
    expect(looksLikeKey(a)).toBe(true);
    expect(keyPrefix(a)).toBe(a.slice(0, 14));
    expect(hashKey(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKey(a)).not.toBe(hashKey(b));
  });

  it("reads the key from the Authorization header", () => {
    const key = newApiKey();
    expect(bearer(`Bearer ${key}`)).toBe(key);
    expect(bearer(`bearer  ${key}`)).toBe(key);
    expect(bearer(key)).toBe(key);
    expect(bearer("Bearer abc")).toBeNull();
    expect(bearer(null)).toBeNull();
  });
});

describe("webhook signatures", () => {
  const secret = newWebhookSecret();
  const body = JSON.stringify({ id: "evt", type: "order.paid" });
  it("verifies its own signature within five minutes", () => {
    const now = Date.UTC(2026, 11, 2, 10);
    const header = signature(secret, body, now / 1000);
    expect(verifySignature(header, body, secret, now)).toBe(true);
    expect(verifySignature(header, body, secret, now + 299_000)).toBe(true);
    expect(verifySignature(header, body, secret, now + 301_000)).toBe(false);
    expect(verifySignature(header, `${body} `, secret, now)).toBe(false);
    expect(verifySignature(header, body, newWebhookSecret(), now)).toBe(false);
    expect(verifySignature("t=1,v1=zz", body, secret, now)).toBe(false);
    expect(verifySignature(null, body, secret, now)).toBe(false);
  });
});

describe("retries", () => {
  it("backs off and gives up after the last attempt", () => {
    const now = 0;
    expect(nextAttempt(1, now)?.getTime()).toBe(60_000);
    expect(nextAttempt(2, now)?.getTime()).toBe(300_000);
    expect(nextAttempt(MAX_ATTEMPTS - 1, now)?.getTime()).toBe(86_400_000);
    expect(nextAttempt(MAX_ATTEMPTS, now)).toBeNull();
  });
});

describe("endpoint urls", () => {
  it("accepts public https urls only", () => {
    expect(cleanWebhookUrl(" https://example.com/hooks/sellycat#x ")).toEqual({ ok: true, url: "https://example.com/hooks/sellycat" });
    expect(cleanWebhookUrl("http://example.com/x")).toEqual({ ok: false, error: "https" });
    expect(cleanWebhookUrl("https://localhost/x")).toEqual({ ok: false, error: "host" });
    expect(cleanWebhookUrl("https://10.0.0.1/x")).toEqual({ ok: false, error: "host" });
    expect(cleanWebhookUrl("https://intranet/x")).toEqual({ ok: false, error: "host" });
    expect(cleanWebhookUrl("https://user:pw@example.com")).toEqual({ ok: false, error: "url" });
    expect(cleanWebhookUrl("https://example.com:8443/x")).toEqual({ ok: false, error: "url" });
    expect(cleanWebhookUrl("nope")).toEqual({ ok: false, error: "url" });
  });
});

describe("query parameters", () => {
  it("limits and times", () => {
    expect(parseLimit(null)).toBe(25);
    expect(parseLimit("500")).toBe(100);
    expect(parseLimit("0")).toBe(25);
    expect(parseLimit("10")).toBe(10);
    expect(parseTime("2026-12-01")).toBe("2026-12-01T00:00:00.000Z");
    expect(parseTime("gestern")).toBeNull();
    expect(parseTime(null)).toBeNull();
  });
});
