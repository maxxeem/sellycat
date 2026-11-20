/** Analytics periods and totals (pure, isomorphic, unit-tested). */

/** Daily visit counts start on this day; earlier periods have sales but no views. */
export const VIEWS_SINCE = "2026-11-20";

export const RANGES = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGES)[number];

export function parseRange(value: string | string[] | undefined): RangeDays {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGES as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

/** YYYY-MM-DD of `now` in a time zone. */
export function dayIn(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Period = { from: string; to: string };

/** The last `days` days up to today, and the same length right before (for the comparison). */
export function periods(today: string, days: RangeDays): { current: Period; previous: Period } {
  const from = addDays(today, -(days - 1));
  return { current: { from, to: today }, previous: { from: addDays(from, -days), to: addDays(from, -1) } };
}

export type DailyRow = {
  day: string;
  revenue_cents: number;
  fee_cents: number;
  orders: number;
  vouchers: number;
  checkouts: number;
  redemptions: number;
  shop_views: number;
  deal_views: number;
};

export type Totals = Omit<DailyRow, "day"> & {
  /** Paid orders per deal-page view (0..1), null without views. */
  conversion: number | null;
  /** Net revenue per paid order, null without orders. */
  averageCents: number | null;
};

const KEYS = ["revenue_cents", "fee_cents", "orders", "vouchers", "checkouts", "redemptions", "shop_views", "deal_views"] as const;

function sumRows(rows: DailyRow[]): Omit<DailyRow, "day"> {
  return Object.fromEntries(KEYS.map((k) => [k, rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)])) as Omit<DailyRow, "day">;
}

export function totals(rows: DailyRow[]): Totals {
  const sum = sumRows(rows);
  return {
    ...sum,
    conversion: sum.deal_views > 0 ? Math.min(1, sum.orders / sum.deal_views) : null,
    averageCents: sum.orders > 0 ? Math.round(sum.revenue_cents / sum.orders) : null,
  };
}

/** Relative change (−1 = −100 %); null when there is nothing to compare with. */
export function change(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

/** Long periods are shown per week (or month) so the bars stay readable. */
export function bucket(rows: DailyRow[], days: RangeDays): DailyRow[] {
  if (days <= 30) return rows;
  const size = days === 90 ? 7 : 30;
  const out: DailyRow[] = [];
  // Group from the end, so the last bar always ends today.
  for (let end = rows.length; end > 0; end -= size) {
    const part = rows.slice(Math.max(0, end - size), end);
    out.unshift({ day: part[0].day, ...sumRows(part) });
  }
  return out;
}
