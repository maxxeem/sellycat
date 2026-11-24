/**
 * The deal editor's form state and its validation (isomorphic: the editor shows the same errors
 * the server enforces). Error values are keys of the `deals.errors` dictionary.
 */
import type { JSONContent } from "@tiptap/core";
import { parseMoney, type RedeemWindow } from "./deal-status";
import { isoToZurichLocal, zurichLocalToIso } from "./time";

export const BARCODE_TYPES = ["ean13", "ean8", "upca", "code128", "code39", "itf14", "datamatrix", "pdf417"] as const;

export type DealForm = {
  title: string;
  subtitle: string;
  slug: string;
  description: JSONContent | null;
  terms: string;
  faq: Array<{ q: string; a: string }>;
  partnerId: string;
  categoryId: string;
  locationIds: string[];
  images: Array<{ url: string; alt: string }>;
  dealType: "fixed" | "value";
  price: string;
  compareAt: string;
  value: string;
  partial: boolean;
  totalQty: string;
  maxPerOrder: string;
  maxPerBuyer: string;
  salesStart: string;
  salesEnd: string;
  redeemValidity: "none" | "until_date" | "days_after_purchase";
  redeemUntil: string;
  redeemDays: string;
  windows: RedeemWindow[];
  codeFormat: "qr" | "numeric" | "barcode";
  barcodeType: string;
  codeSource: "generated" | "pool";
  showRemaining: boolean;
  showCountdown: boolean;
  showStockBar: boolean;
  featured: boolean;
  /** Announce before the sales start: no price, no buying, countdown to the start. */
  teaser: boolean;
  /** Send this deal to the deal alert subscribers when it goes live. */
  alert: boolean;
  /** Partner settlement for this deal: off, after sale or after redemption. */
  settleMode: "off" | "sale" | "redemption";
  settleKind: "percent" | "fixed";
  /** Commission the shop keeps, in percent of the price paid ("15" or "12.5"). */
  settleCommission: string;
  /** Fixed payout to the partner per voucher (money). */
  settlePayout: string;
};

export type DealErrorKey = "title" | "slug" | "slugTaken" | "price" | "compareAt" | "value" | "window" | "redeemUntil" | "redeemDays" | "barcode" | "teaserStart" | "settlePartner" | "settleCommission" | "settlePayout";
export type DealErrors = Partial<Record<keyof DealForm, DealErrorKey>>;

const cents = (v: string) => (v.trim() === "" ? null : parseMoney(v));
const intOrNull = (v: string) => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

/** "12.5" → 1250 basis points (0–100 %, two decimals); null when invalid. */
export function commissionBps(v: string): number | null {
  const t = v.trim().replace(",", ".").replace(/%$/, "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const bps = Math.round(Number(t) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

export function validateDeal(f: DealForm): DealErrors {
  const e: DealErrors = {};
  if (!f.title.trim()) e.title = "title";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(f.slug)) e.slug = "slug";
  const price = cents(f.price);
  if (price === null || Number.isNaN(price)) e.price = "price";
  const compare = cents(f.compareAt);
  if (f.compareAt.trim() && (compare === null || (price !== null && compare <= price))) e.compareAt = "compareAt";
  if (f.dealType === "value") {
    const value = cents(f.value);
    if (!value) e.value = "value";
  }
  for (const k of ["totalQty", "maxPerOrder", "maxPerBuyer"] as const) if (Number.isNaN(intOrNull(f[k]))) e[k] = "price";
  const start = zurichLocalToIso(f.salesStart);
  const end = zurichLocalToIso(f.salesEnd);
  if (start && end && end <= start) e.salesEnd = "window";
  if (f.teaser && !start) e.salesStart = "teaserStart";
  if (f.redeemValidity === "until_date" && !/^\d{4}-\d{2}-\d{2}$/.test(f.redeemUntil)) e.redeemUntil = "redeemUntil";
  if (f.redeemValidity === "days_after_purchase" && !(Number(f.redeemDays) >= 1)) e.redeemDays = "redeemDays";
  if (f.settleMode !== "off") {
    if (!f.partnerId) e.settleMode = "settlePartner";
    if (f.settleKind === "percent" && commissionBps(f.settleCommission) === null) e.settleCommission = "settleCommission";
    if (f.settleKind === "fixed") {
      const payout = cents(f.settlePayout);
      if (payout === null || Number.isNaN(payout) || payout < 0) e.settlePayout = "settlePayout";
    }
  }
  if (f.codeFormat === "barcode" && !BARCODE_TYPES.includes(f.barcodeType as (typeof BARCODE_TYPES)[number])) e.barcodeType = "barcode";
  return e;
}

/** Form → deal row (assumes validateDeal passed). */
export function dealRow(f: DealForm) {
  const windows = f.windows.filter((w) => w.days.length && /^\d{2}:\d{2}$/.test(w.from) && /^\d{2}:\d{2}$/.test(w.to) && w.from < w.to);
  return {
    title: f.title.trim(),
    subtitle: f.subtitle.trim() || null,
    slug: f.slug,
    description: (f.description ?? {}) as never,
    terms: f.terms.trim() || null,
    faq: f.faq.filter((x) => x.q.trim() && x.a.trim()).map((x) => ({ q: x.q.trim(), a: x.a.trim() })) as never,
    partner_id: f.partnerId || null,
    category_id: f.categoryId || null,
    deal_type: f.dealType,
    price_cents: cents(f.price) ?? 0,
    compare_at_cents: cents(f.compareAt),
    value_cents: f.dealType === "value" ? cents(f.value) : null,
    partial_redemption: f.dealType === "value" && f.partial,
    total_qty: intOrNull(f.totalQty),
    max_per_order: intOrNull(f.maxPerOrder) || null,
    max_per_buyer: intOrNull(f.maxPerBuyer) || null,
    sales_start: zurichLocalToIso(f.salesStart),
    sales_end: zurichLocalToIso(f.salesEnd),
    redeem_validity: f.redeemValidity,
    redeem_until: f.redeemValidity === "until_date" ? f.redeemUntil : null,
    redeem_days: f.redeemValidity === "days_after_purchase" ? Number(f.redeemDays) : null,
    redeem_windows: windows as never,
    code_format: f.codeFormat,
    barcode_type: f.codeFormat === "barcode" ? (f.barcodeType as (typeof BARCODE_TYPES)[number]) : null,
    code_source: f.codeSource,
    show_remaining: f.showRemaining,
    show_countdown: f.showCountdown,
    show_stock_bar: f.showStockBar && f.totalQty !== "",
    featured: f.featured,
    teaser: f.teaser && Boolean(zurichLocalToIso(f.salesStart)),
    alert_skip: !f.alert,
    settle_mode: f.settleMode,
    settle_kind: f.settleKind,
    settle_commission_bps: f.settleKind === "percent" ? (commissionBps(f.settleCommission) ?? 0) : 0,
    settle_payout_cents: f.settleKind === "fixed" ? cents(f.settlePayout) : null,
  };
}

const money = (c: number | null) => (c === null ? "" : (c / 100).toFixed(c % 100 === 0 ? 0 : 2));
const num = (n: number | null) => (n === null ? "" : String(n));

type DealRowIn = {
  title: string; subtitle: string | null; slug: string; description: unknown; terms: string | null; faq: unknown;
  partner_id: string | null; category_id: string | null; deal_type: "fixed" | "value"; price_cents: number;
  compare_at_cents: number | null; value_cents: number | null; partial_redemption: boolean; total_qty: number | null;
  max_per_order: number | null; max_per_buyer: number | null; sales_start: string | null; sales_end: string | null;
  redeem_validity: "none" | "until_date" | "days_after_purchase"; redeem_until: string | null; redeem_days: number | null;
  redeem_windows: unknown; code_format: "qr" | "numeric" | "barcode"; barcode_type: string | null; code_source: "generated" | "pool";
  show_remaining: boolean; show_countdown: boolean; show_stock_bar?: boolean; featured: boolean; teaser?: boolean; alert_skip?: boolean;
  settle_mode?: string; settle_kind?: string; settle_commission_bps?: number; settle_payout_cents?: number | null;
};

/** Deal row → form state. */
export function dealToForm(d: DealRowIn, images: Array<{ url: string; alt: string | null }>, locationIds: string[]): DealForm {
  return {
    title: d.title,
    subtitle: d.subtitle ?? "",
    slug: d.slug,
    description: (d.description && typeof d.description === "object" && "type" in (d.description as object) ? d.description : null) as JSONContent | null,
    terms: d.terms ?? "",
    faq: Array.isArray(d.faq) ? (d.faq as Array<{ q: string; a: string }>) : [],
    partnerId: d.partner_id ?? "",
    categoryId: d.category_id ?? "",
    locationIds,
    images: images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    dealType: d.deal_type,
    price: money(d.price_cents),
    compareAt: money(d.compare_at_cents),
    value: money(d.value_cents),
    partial: d.partial_redemption,
    totalQty: num(d.total_qty),
    maxPerOrder: num(d.max_per_order),
    maxPerBuyer: num(d.max_per_buyer),
    salesStart: isoToZurichLocal(d.sales_start),
    salesEnd: isoToZurichLocal(d.sales_end),
    redeemValidity: d.redeem_validity,
    redeemUntil: d.redeem_until ?? "",
    redeemDays: num(d.redeem_days),
    windows: Array.isArray(d.redeem_windows) ? (d.redeem_windows as RedeemWindow[]) : [],
    codeFormat: d.code_format,
    barcodeType: d.barcode_type ?? "",
    codeSource: d.code_source,
    showRemaining: d.show_remaining,
    showCountdown: d.show_countdown,
    showStockBar: d.show_stock_bar ?? false,
    featured: d.featured,
    teaser: d.teaser ?? false,
    alert: !d.alert_skip,
    settleMode: d.settle_mode === "sale" || d.settle_mode === "redemption" ? d.settle_mode : "off",
    settleKind: d.settle_kind === "fixed" ? "fixed" : "percent",
    settleCommission: d.settle_commission_bps ? String(d.settle_commission_bps / 100) : "",
    settlePayout: money(d.settle_payout_cents ?? null),
  };
}
