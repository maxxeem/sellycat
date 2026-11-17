/**
 * Deal status and money helpers (isomorphic, unit-tested). The database stores the editorial
 * state (draft/published/ended); what a buyer sees is derived from it, the sales window and
 * the stock at a given moment.
 */
export type DealState = "draft" | "published" | "ended";
export type DealStatus = "draft" | "scheduled" | "live" | "sold_out" | "ended";

export type DealStock = {
  state: DealState;
  sales_start: string | null;
  sales_end: string | null;
  total_qty: number | null;
  sold_qty: number;
  reserved_qty: number;
  /** Pool deals sell at most as many units as there are free codes (auto-stop). */
  code_source?: "generated" | "pool";
  pool_free?: number;
  /** Announced without price until the sales start. */
  teaser?: boolean;
};

/** Units still for sale (null = unlimited). */
export function remaining(d: Pick<DealStock, "total_qty" | "sold_qty" | "reserved_qty" | "code_source" | "pool_free">): number | null {
  const byQty = d.total_qty === null ? null : Math.max(0, d.total_qty - d.sold_qty - d.reserved_qty);
  if (d.code_source !== "pool") return byQty;
  const byPool = Math.max(0, (d.pool_free ?? 0) - d.reserved_qty);
  return byQty === null ? byPool : Math.min(byQty, byPool);
}

export function dealStatus(d: DealStock, now: Date = new Date()): DealStatus {
  if (d.state === "draft") return "draft";
  if (d.state === "ended") return "ended";
  const t = now.getTime();
  if (d.sales_end && new Date(d.sales_end).getTime() <= t) return "ended";
  if (d.sales_start && new Date(d.sales_start).getTime() > t) return "scheduled";
  // Reserved units may come back when a checkout is abandoned, so only sold units end a deal for good.
  const left = remaining(d);
  if (left === 0) return "sold_out";
  return "live";
}

/** A teaser shows no price and cannot be bought until its sales start; then it is a normal deal. */
export const isTeaser = (d: DealStock, now?: Date) => Boolean(d.teaser) && dealStatus(d, now) === "scheduled";

/** Buyers can add it to the cart right now. */
export const isBuyable = (d: DealStock, now?: Date) => dealStatus(d, now) === "live";

/** Shown in the shop: live, sold out and announced deals; drafts and ended deals never. */
export const isListed = (d: DealStock, now?: Date) => ["live", "sold_out", "scheduled"].includes(dealStatus(d, now));

export function formatMoney(cents: number, currency: string, locale: string): string {
  const tag = locale === "de" ? "de-CH" : "en-CH";
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(tag, { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** Savings in percent (rounded down, so we never promise more than is true). */
export function savingsPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.floor(((compareAt - price) / compareAt) * 100);
}

/** CHF 12.50 → 1250 (accepts "12.50", "12,50", "12.–", "12"). */
export function parseMoney(input: string): number | null {
  const v = input.trim().replace(/[’'\s]/g, "").replace(/\.–$|\.-$/, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}

export type RedeemWindow = { days: number[]; from: string; to: string };

/** "Mo–Fr 11:00–14:00" style summary (ISO weekdays 1 = Monday). */
export function describeWindows(windows: RedeemWindow[], locale: string): string[] {
  const names = locale === "de" ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return windows.map((w) => {
    const days = [...w.days].sort((a, b) => a - b);
    const consecutive = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
    const dayText = consecutive ? `${names[days[0] - 1]}–${names[days[days.length - 1] - 1]}` : days.map((d) => names[d - 1]).join(", ");
    return `${dayText} ${w.from}–${w.to}`;
  });
}

/** Is a moment inside one of the windows (Europe/Zurich wall time)? Empty list = always. */
export function withinWindows(windows: RedeemWindow[], at: Date, timeZone = "Europe/Zurich"): boolean {
  if (!windows.length) return true;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(at);
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "") + 1;
  const hm = `${parts.find((p) => p.type === "hour")?.value}:${parts.find((p) => p.type === "minute")?.value}`.replace(/^24/, "00");
  return windows.some((w) => w.days.includes(wd) && hm >= w.from && hm < w.to);
}
