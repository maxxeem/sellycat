/**
 * Plans (pure, tested): list prices per interval and currency, limits, fees and pricing-page copy,
 * all edited by staff under Staff → Pläne. Isomorphic (used by the pricing page and the dashboard).
 */
import { CURRENCIES, type Currency } from "./currency";

export const INTERVALS = ["monthly", "yearly"] as const;
export type Interval = (typeof INTERVALS)[number];
export type PlanPrices = Record<Interval, Partial<Record<Currency, number>>>;

export const LIMIT_NUMBERS = ["deals_live", "seats"] as const;
export const LIMIT_FLAGS = ["custom_domain", "custom_mail_domain", "api", "branding"] as const;
/** `shops`: shops one subscription includes (Business: up to 5; 1 = only this shop). */
export type PlanLimits = { deals_live: number | null; seats: number | null; shops: number; custom_domain: boolean; custom_mail_domain: boolean; api: boolean; branding: boolean };

export type PlanCopy = { tagline: string; badge: string };
export type PlanRow = {
  id: string;
  name: string;
  sort_order: number;
  is_public: boolean;
  contact_only: boolean;
  limits: unknown;
  prices: unknown;
  marketing: unknown;
  application_fee_bps: number;
  application_fee_fixed: number;
  application_fee_min: number;
  trial_days: number;
};
export type Plan = {
  id: string;
  name: string;
  sortOrder: number;
  isPublic: boolean;
  contactOnly: boolean;
  limits: PlanLimits;
  prices: PlanPrices;
  copy: Record<"de" | "en", PlanCopy>;
  feeBps: number;
  feeFixed: number;
  /** Minimum fee per order in minor units (100 = 1 CHF/EUR/USD). */
  feeMin: number;
  trialDays: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Reads plans.prices; unknown keys and invalid amounts are dropped. */
export function parsePlanPrices(raw: unknown): PlanPrices {
  const out: PlanPrices = { monthly: {}, yearly: {} };
  if (!raw || typeof raw !== "object") return out;
  for (const interval of INTERVALS) {
    const block = (raw as Record<string, unknown>)[interval];
    if (!block || typeof block !== "object") continue;
    for (const c of CURRENCIES) {
      const v = (block as Record<string, unknown>)[c];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[interval][c] = round2(v);
    }
  }
  return out;
}

export function parseLimits(raw: unknown): PlanLimits {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
  return { deals_live: num(r.deals_live), seats: num(r.seats), shops: Math.max(1, num(r.shops) ?? 1), custom_domain: r.custom_domain === true, custom_mail_domain: r.custom_mail_domain === true, api: r.api === true, branding: r.branding === true };
}

function parseCopy(raw: unknown): Record<"de" | "en", PlanCopy> {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const one = (v: unknown): PlanCopy => {
    const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    return { tagline: typeof o.tagline === "string" ? o.tagline : "", badge: typeof o.badge === "string" ? o.badge : "" };
  };
  return { de: one(r.de), en: one(r.en) };
}

export function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isPublic: row.is_public,
    contactOnly: row.contact_only,
    limits: parseLimits(row.limits),
    prices: parsePlanPrices(row.prices),
    copy: parseCopy(row.marketing),
    feeBps: row.application_fee_bps,
    feeFixed: row.application_fee_fixed,
    feeMin: row.application_fee_min ?? 0,
    trialDays: row.trial_days,
  };
}

/** One form value ("49", "49.90", "49,90", blank) → amount or null; NaN = invalid. */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/['’\s]/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100_000 ? round2(n) : Number.NaN;
}

/** "10 %" / "2.5 %" from basis points. */
export const feePercent = (bps: number) => `${Number.isInteger(bps / 100) ? bps / 100 : (bps / 100).toFixed(2).replace(/0$/, "")} %`;

/** "mind. CHF 1" from the minimum in minor units; `minText` is the dictionary's «mind. {amount}». */
export function feeMinText(minMinor: number, currency: Currency, minText: string): string {
  const v = minMinor / 100;
  // Non-breaking spaces: "mind. CHF 1" never wraps in the middle.
  return minText.replace(/ /g, "\u00a0").replace("{amount}", `${currency}\u00a0${Number.isInteger(v) ? v : v.toFixed(2)}`);
}

/** "19.5 % pro Verkauf, mind. CHF 1": a fee text with the minimum per sale appended (unchanged without one). */
export function withFeeMin(text: string, minMinor: number, currency: Currency, minText: string): string {
  return minMinor > 0 ? `${text}, ${feeMinText(minMinor, currency, minText)}` : text;
}

/** Percent as typed ("10", "2,5", "2.5 %") → basis points; NaN = invalid. */
export function parsePercent(raw: string): number {
  const s = raw.trim().replace("%", "").replace(",", ".").trim();
  const n = Number(s);
  return s !== "" && Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n * 100) : Number.NaN;
}

/** "CHF 49.–" / "EUR 49.90" (same number in every currency). */
export function formatPrice(amount: number, currency: Currency): string {
  return `${currency} ${Number.isInteger(amount) ? `${amount}.–` : amount.toFixed(2)}`;
}

/** The monthly equivalent of the yearly price ("39"), null without a yearly price. */
export function yearlyPerMonth(prices: PlanPrices, currency: Currency): number | null {
  const y = prices.yearly[currency];
  return y === undefined ? null : round2(y / 12);
}

/** Free = no positive price at all and not contact-only. */
export const isFree = (p: Plan) => !p.contactOnly && INTERVALS.every((i) => !Object.values(p.prices[i]).some((v) => (v ?? 0) > 0));

/** Can be booked online in this currency and interval (a positive price exists, not contact-only). */
export const bookable = (p: Plan, interval: Interval, currency: Currency) => !p.contactOnly && (p.prices[interval][currency] ?? 0) > 0;
