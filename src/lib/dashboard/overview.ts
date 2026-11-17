/** Key figures for the dashboard start page (pure, tested). */

export type OverviewOrder = {
  paid_at: string | null;
  amount_cents: number;
  refunded_cents: number;
  order_items: Array<{ title: string; qty: number; deal_id: string | null }>;
};

export type Figure = { value: number; previous: number };

export type Overview = {
  revenue: Figure;
  orders: Figure;
  vouchers: Figure;
  /** Net revenue per day, oldest first (`days` entries, Swiss calendar days). */
  daily: Array<{ day: string; cents: number }>;
  top: Array<{ title: string; qty: number }>;
};

const DAY = 86_400_000;
const zurichDay = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });

/**
 * Figures of the last `days` days and the same span before (for the trend). Counts paid orders,
 * also when partly or fully refunded later; revenue is net of refunds.
 */
export function summarise(orders: OverviewOrder[], now: Date, days = 30): Overview {
  const end = now.getTime();
  const start = end - days * DAY;
  const before = start - days * DAY;
  const fig = (): Figure => ({ value: 0, previous: 0 });
  const revenue = fig();
  const count = fig();
  const vouchers = fig();
  const perDay = new Map<string, number>();
  const top = new Map<string, { title: string; qty: number }>();

  for (const o of orders) {
    if (!o.paid_at) continue;
    const at = new Date(o.paid_at).getTime();
    if (at > end || at <= before) continue;
    const key = at > start ? "value" : "previous";
    const net = o.amount_cents - o.refunded_cents;
    const qty = o.order_items.reduce((n, i) => n + i.qty, 0);
    revenue[key] += net;
    count[key] += 1;
    vouchers[key] += qty;
    if (key === "value") {
      const d = zurichDay(at);
      perDay.set(d, (perDay.get(d) ?? 0) + net);
      for (const i of o.order_items) {
        const id = i.deal_id ?? i.title;
        const entry = top.get(id) ?? { title: i.title, qty: 0 };
        entry.qty += i.qty;
        top.set(id, entry);
      }
    }
  }

  const daily = Array.from({ length: days }, (_, i) => {
    const day = zurichDay(end - (days - 1 - i) * DAY);
    return { day, cents: perDay.get(day) ?? 0 };
  });
  return {
    revenue,
    orders: count,
    vouchers,
    daily,
    top: [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
  };
}

/** Change against the previous span in percent (null when there is nothing to compare). */
export function trend(f: Figure): number | null {
  if (!f.previous) return null;
  return Math.round(((f.value - f.previous) / f.previous) * 100);
}
