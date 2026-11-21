/**
 * Signup access rules (pure, tested, isomorphic): signup modes, invite code format and
 * generation, the landing page CTA per mode, and waitlist input validation.
 */
import { z } from "zod";

export const SIGNUP_MODES = ["paused", "invite", "open"] as const;
export type SignupMode = (typeof SIGNUP_MODES)[number];
export const isSignupMode = (v: unknown): v is SignupMode => typeof v === "string" && (SIGNUP_MODES as readonly string[]).includes(v);

/** What the landing page offers: the waitlist (closed), the code step (invite only) or signup. */
export type SignupCta = { kind: "waitlist" | "code" | "start"; href: string };
export function signupCta(mode: SignupMode): SignupCta {
  if (mode === "open") return { kind: "start", href: "/signup" };
  if (mode === "invite") return { kind: "code", href: "/signup" };
  return { kind: "waitlist", href: "/#warteliste" };
}

/** Does /signup need a code before the form? (Closed signup still accepts personal invite links.) */
export const codeRequired = (mode: SignupMode) => mode !== "open";

// ---------------------------------------------------------------- codes

/** No 0/O, 1/I/L: readable when typed from a mail or a flyer. 31 symbols. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 10;

/** Upper case, spaces and underscores to dashes, anything else dropped. */
export function normaliseCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Same rule as the database check: 4–40 characters, letters, digits, single dashes inside. */
export const isValidCode = (code: string) => /^[A-Z0-9](?:[A-Z0-9-]{2,38}[A-Z0-9])$/.test(code) && !code.includes("--");

/** A random code (crypto, uniform via rejection), grouped as XXXXX-XXXXX, optionally prefixed. */
export function generateCode(prefix = "", random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const out: string[] = [];
  while (out.length < CODE_LENGTH) {
    for (const b of random(CODE_LENGTH * 2)) {
      if (b >= 248) continue; // 248 = 8 × 31: keeps the distribution uniform
      out.push(CODE_ALPHABET[b % CODE_ALPHABET.length]);
      if (out.length === CODE_LENGTH) break;
    }
  }
  const body = `${out.slice(0, 5).join("")}-${out.slice(5).join("")}`;
  const p = normaliseCode(prefix).slice(0, 20);
  return p ? `${p}-${body}` : body;
}

/** Status shown to staff. */
export type CodeState = "active" | "disabled" | "expired" | "used_up";
export function codeState(c: { disabled_at: string | null; expires_at: string | null; uses: number; max_uses: number | null }, now = Date.now()): CodeState {
  if (c.disabled_at) return "disabled";
  if (c.expires_at && Date.parse(c.expires_at) <= now) return "expired";
  if (c.max_uses !== null && c.uses >= c.max_uses) return "used_up";
  return "active";
}

/** Prefilled signup link. */
export const codeLink = (siteUrl: string, code: string) => `${siteUrl.replace(/\/$/, "")}/signup?code=${encodeURIComponent(code)}`;

// ---------------------------------------------------------------- waitlist

export const USE_CASES = ["media", "association", "city_tourism", "retail_gastro", "agency", "other"] as const;
export type UseCase = (typeof USE_CASES)[number];
export const WAITLIST_STATUSES = ["new", "invited", "registered", "rejected"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

/** "firma.ch" → "https://firma.ch"; invalid → null (stored as text only, never fetched). */
export function normaliseWebsite(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || u.username || u.password) return null;
    return u.toString().replace(/\/$/, "").slice(0, 200);
  } catch {
    return null;
  }
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  name: optional(120),
  company: optional(120),
  website: z
    .string()
    .trim()
    .max(200)
    .transform((s, ctx) => {
      if (!s) return null;
      const w = normaliseWebsite(s);
      if (!w) ctx.addIssue({ code: "custom", message: "website" });
      return w;
    }),
  useCase: z.union([z.enum(USE_CASES), z.literal("").transform(() => null)]),
  message: optional(1000),
  locale: z.enum(["de", "en"]),
  consent: z.literal("on"),
});
export type WaitlistInput = z.infer<typeof waitlistSchema>;

export type BotSignal = "honeypot" | "no-time" | "too-fast" | "stale";

/**
 * Bot signals: the hidden field was filled, the form carries no render time, or it came back faster
 * than a human types. A render time in the future (the visitor's clock runs ahead of ours) is no
 * signal: Turnstile and the rate limits still apply.
 */
export function botSignal(i: { honeypot: string; renderedAt: number; now?: number }): BotSignal | null {
  const now = i.now ?? Date.now();
  if (i.honeypot.trim() !== "") return "honeypot";
  if (!Number.isFinite(i.renderedAt) || i.renderedAt <= 0) return "no-time";
  const elapsed = now - i.renderedAt;
  if (elapsed >= 0 && elapsed < 2500) return "too-fast";
  if (elapsed > 24 * 3600_000) return "stale";
  return null;
}

export const looksLikeBot = (i: { honeypot: string; renderedAt: number; now?: number }) => botSignal(i) !== null;
