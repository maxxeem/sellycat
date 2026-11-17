/**
 * Pure payment helpers (unit-tested): key hygiene, Connect account state, OAuth state tokens,
 * checkout input and error mapping, Stripe dashboard links.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { remaining } from "@/lib/shop/deal-status";

/**
 * A key as it should reach Stripe. A paste into a hosting dashboard easily adds a newline, a
 * space or quotes, which Stripe's client reports as a vague connection error.
 */
export function cleanSecret(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const cleaned = raw.replace(/[^\x21-\x7e]/g, "").replace(/^["']+|["']+$/g, "");
  return cleaned || undefined;
}

export function looksLikeStripeKey(key: string | undefined): boolean {
  return Boolean(key && /^(sk|rk)_(test|live)_[A-Za-z0-9]{16,}$/.test(key));
}

/** The part of a Stripe account we keep (`stripe_accounts`). */
export type AccountState = {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements: string[];
  business_name: string | null;
  country: string | null;
  default_currency: string | null;
};

type AccountLike = {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
  requirements?: { currently_due?: string[] | null; past_due?: string[] | null } | null;
  business_profile?: { name?: string | null } | null;
  settings?: { dashboard?: { display_name?: string | null } | null } | null;
  country?: string | null;
  default_currency?: string | null;
};

export function accountState(a: AccountLike): AccountState {
  const due = [...(a.requirements?.past_due ?? []), ...(a.requirements?.currently_due ?? [])];
  return {
    charges_enabled: Boolean(a.charges_enabled),
    payouts_enabled: Boolean(a.payouts_enabled),
    details_submitted: Boolean(a.details_submitted),
    requirements: [...new Set(due)],
    business_name: a.business_profile?.name || a.settings?.dashboard?.display_name || null,
    country: a.country ?? null,
    default_currency: a.default_currency ?? null,
  };
}

export type ConnectStatus = "none" | "pending" | "active";

/** What the dashboard shows: not connected, connected but Stripe still needs something, ready. */
export function connectStatus(row: { charges_enabled: boolean } | null | undefined): ConnectStatus {
  if (!row) return "none";
  return row.charges_enabled ? "active" : "pending";
}

// ---------------------------------------------------------------- OAuth state
/** Cookie holding the nonce of a running Connect OAuth round trip. */
export const CONNECT_COOKIE = "sc_connect";

/**
 * The `state` of the Connect OAuth round trip: tenant, user, a nonce (also kept in a cookie, so
 * the callback only completes in the browser that started it) and an expiry, signed with HMAC.
 */
export type ConnectState = { tenantId: string; userId: string; nonce: string; exp: number };

export function signState(state: ConnectState, secret: string): string {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(token: string | null | undefined, secret: string, now = Date.now()): ConnectState | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const state = JSON.parse(Buffer.from(body, "base64url").toString()) as ConnectState;
    if (typeof state.exp !== "number" || state.exp < now) return null;
    if (!state.tenantId || !state.userId || !state.nonce) return null;
    return state;
  } catch {
    return null;
  }
}

/** Stripe's Connect OAuth page: the customer signs in to (or creates) their own Stripe account. */
export function authorizeUrl(p: { clientId: string; state: string; redirectUri: string; email?: string; businessName?: string; country?: string }): string {
  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", p.clientId);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("state", p.state);
  url.searchParams.set("redirect_uri", p.redirectUri);
  if (p.email) url.searchParams.set("stripe_user[email]", p.email);
  if (p.businessName) url.searchParams.set("stripe_user[business_name]", p.businessName);
  if (p.country) url.searchParams.set("stripe_user[country]", p.country);
  return url.toString();
}

/** A page in the customer's own Stripe dashboard (test-mode objects live under /test). */
export function stripeDashboardUrl(livemode: boolean, path = ""): string {
  return `https://dashboard.stripe.com${livemode ? "" : "/test"}${path}`;
}

// ---------------------------------------------------------------- checkout
export const checkoutInput = z.object({
  qty: z.coerce.number().int().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().max(120).optional().default(""),
  newsletter: z.coerce.boolean().optional().default(false),
  terms: z.literal(true),
  gift: z
    .object({
      name: z.string().trim().max(120).optional().default(""),
      email: z.string().trim().toLowerCase().max(200).optional().default(""),
      from: z.string().trim().max(120).optional().default(""),
      message: z.string().trim().max(500).optional().default(""),
      sendOn: z.string().trim().optional().default(""),
    })
    .nullish(),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export type GiftFields = { gift: true; gift_name: string | null; gift_email: string; gift_from: string | null; gift_message: string | null; gift_send_on: string | null };

/**
 * The gift part of a checkout → order columns, or "invalid". The send day is a Zurich date from
 * today up to a year ahead; today (or empty) means right after payment.
 */
export function giftFields(gift: CheckoutInput["gift"], today: string): GiftFields | null | "invalid" {
  if (!gift) return null;
  if (!z.string().email().safeParse(gift.email).success) return "invalid";
  let sendOn: string | null = null;
  if (gift.sendOn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gift.sendOn) || Number.isNaN(Date.parse(`${gift.sendOn}T00:00:00Z`))) return "invalid";
    const max = new Date(Date.parse(`${today}T00:00:00Z`) + 366 * 86_400_000).toISOString().slice(0, 10);
    if (gift.sendOn < today || gift.sendOn > max) return "invalid";
    sendOn = gift.sendOn === today ? null : gift.sendOn;
  }
  const opt = (s: string) => s.replace(/\r\n?/g, "\n").trim() || null;
  return { gift: true, gift_name: opt(gift.name), gift_email: gift.email, gift_from: opt(gift.from), gift_message: opt(gift.message), gift_send_on: sendOn };
}

export const CHECKOUT_ERRORS = ["quantity", "email", "unavailable", "not_started", "ended", "max_per_order", "max_per_buyer", "sold_out", "not_enough", "payments", "gift", "rate", "failed"] as const;
export type CheckoutError = (typeof CHECKOUT_ERRORS)[number];

/** `checkout:<reason>` raised by start_checkout() → a known reason (anything else: failed). */
export function checkoutError(message: string | null | undefined): CheckoutError {
  const m = /checkout:([a-z_]+)/.exec(message ?? "");
  const key = m?.[1] as CheckoutError | undefined;
  return key && (CHECKOUT_ERRORS as readonly string[]).includes(key) ? key : "failed";
}

/**
 * Stripe Checkout sessions expire after 30 minutes at the earliest. The session gets 31 minutes,
 * the reservation in the database 35, so stock is never released while Stripe can still be paid.
 */
export const SESSION_MINUTES = 31;
export const RESERVATION_MINUTES = 35;

/** The largest quantity the form offers: per-order limit, stock left, hard cap. */
export function maxQuantity(deal: { max_per_order: number | null } & Parameters<typeof remaining>[0], cap = 20): number {
  const left = remaining(deal) ?? Infinity;
  return Math.max(0, Math.min(cap, deal.max_per_order ?? cap, left));
}

/** Refund amount a form may ask for: positive, at most what is left on the order. */
export function refundable(order: { amount_cents: number; refunded_cents: number }): number {
  return Math.max(0, order.amount_cents - order.refunded_cents);
}

/** Fonts Stripe Checkout can show (branding_settings.font_family), by family name. */
const STRIPE_FONTS = ["be_vietnam_pro", "bitter", "chakra_petch", "hahmlet", "inconsolata", "inter", "lato", "lora", "m_plus_1_code", "montserrat", "noto_sans", "noto_sans_jp", "noto_serif", "nunito", "open_sans", "pridi", "pt_sans", "pt_serif", "raleway", "roboto", "roboto_slab", "source_sans_pro", "titillium_web", "ubuntu_mono", "zen_maru_gothic"] as const;

type BrandingTheme = { colors: { primary: string; surface: string }; fonts: { body: { source: string; family: string } }; radius: number; buttonStyle: "solid" | "outline" | "pill" };

/**
 * Stripe Checkout look from the shop theme, so the payment form sits on the shop's card colour
 * instead of a white box. Stripe picks readable text colours itself.
 */
export function stripeBranding(theme: BrandingTheme) {
  const font = theme.fonts.body.family.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return {
    background_color: theme.colors.surface,
    button_color: theme.colors.primary,
    border_style: theme.buttonStyle === "pill" ? ("pill" as const) : theme.radius === 0 ? ("rectangular" as const) : ("rounded" as const),
    font_family: (STRIPE_FONTS as readonly string[]).includes(font) ? font : "default",
  };
}
