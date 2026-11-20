/**
 * API keys and webhooks (pure, tested): key format, signatures, retry schedule, URL and query
 * checks. Isomorphic except for `node:crypto` (server and tests only).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const API_SCOPES = ["read", "redeem"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const WEBHOOK_EVENTS = ["order.paid", "order.refunded", "voucher.redeemed", "voucher.redemption_undone", "voucher.voided"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export const isWebhookEvent = (v: unknown): v is WebhookEvent => WEBHOOK_EVENTS.includes(v as WebhookEvent);

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function base62(bytes: number): string {
  // Rejection sampling: no modulo bias.
  let out = "";
  while (out.length < bytes) {
    for (const b of randomBytes(bytes * 2)) {
      if (b < 248 && out.length < bytes) out += BASE62[b % 62];
    }
  }
  return out;
}

export const KEY_PREFIX = "sc_live_";
/** A new secret API key (shown once; only the hash is stored). */
export const newApiKey = () => `${KEY_PREFIX}${base62(32)}`;
/** The visible part, so a key can be recognised in the list. */
export const keyPrefix = (key: string) => key.slice(0, KEY_PREFIX.length + 6);
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const looksLikeKey = (key: string) => new RegExp(`^${KEY_PREFIX}[0-9A-Za-z]{32}$`).test(key);
export const newWebhookSecret = () => `whsec_${base62(40)}`;

/** `Authorization: Bearer <key>` (or the bare key) → key, or null. */
export function bearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.trim().match(/^Bearer\s+(\S+)$/i);
  const key = m ? m[1] : header.trim();
  return looksLikeKey(key) ? key : null;
}

/**
 * Header `Sellycat-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">` (the same
 * scheme as Stripe, so existing verification code is easy to adapt).
 */
export function signature(secret: string, body: string, t: number): string {
  const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

/** What a receiver does (also in the help article): signature valid and at most `toleranceS` old. */
export function verifySignature(header: string | null, body: string, secret: string, now = Date.now(), toleranceS = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1 || Math.abs(now / 1000 - t) > toleranceS) return false;
  const expected = Buffer.from(signature(secret, body, t).split("v1=")[1], "hex");
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Retries after a failed attempt: 1 min, 5 min, 30 min, 2 h, 6 h, 12 h, 24 h; then given up. */
const RETRY_S = [60, 300, 1800, 7200, 21600, 43200, 86400];
export const MAX_ATTEMPTS = RETRY_S.length + 1;
export function nextAttempt(attempts: number, now = Date.now()): Date | null {
  return attempts >= MAX_ATTEMPTS ? null : new Date(now + RETRY_S[Math.min(attempts, RETRY_S.length) - 1] * 1000);
}

/** Endpoint URL as typed → normalised https URL, or an error key. Private addresses are checked again at send time. */
export function cleanWebhookUrl(input: string): { ok: true; url: string } | { ok: false; error: "url" | "https" | "host" } {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { ok: false, error: "url" };
  }
  if (u.protocol !== "https:") return { ok: false, error: "https" };
  if (u.username || u.password || (u.port && u.port !== "443")) return { ok: false, error: "url" };
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.startsWith("[")) {
    return { ok: false, error: "host" };
  }
  u.hash = "";
  const url = u.toString();
  return url.length > 500 ? { ok: false, error: "url" } : { ok: true, url };
}

/** `?limit=` 1–100 (default 25). */
export function parseLimit(v: string | null, fallback = 25): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 100) : fallback;
}

/** `?since=` / `?before=` as ISO date or date-time → ISO string, or null (invalid = null). */
export function parseTime(v: string | null): string | null {
  if (!v || v.length > 40) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Short text from a receiver's answer for the delivery log. */
export const shortError = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 300);
