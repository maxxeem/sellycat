/**
 * Order of the deals in the shop, chosen by the shop under Shop → Anordnung. Pure and tested.
 * The top deal (featured) always comes first; the rest follows the chosen mode.
 */
import { dealStatus, type DealStock } from "./deal-status";

export const DEAL_ORDERS = ["manual", "newest", "schedule", "popular", "bestseller"] as const;
export type DealOrder = (typeof DEAL_ORDERS)[number];
export const parseDealOrder = (v: unknown): DealOrder => DEAL_ORDERS.find((o) => o === v) ?? "manual";

export type OrderableDeal = DealStock & {
  id: string;
  featured: boolean;
  sort_order?: number;
  published_at?: string | null;
  view_count?: number;
};

const time = (iso: string | null | undefined, fallback: number) => (iso ? new Date(iso).getTime() : fallback);

/** Live first, then announced, then sold out (ended and drafts are not listed anyway). */
const stage = (d: OrderableDeal, now: Date) => ({ live: 0, scheduled: 1, sold_out: 2, ended: 3, draft: 4 })[dealStatus(d, now)];

export function sortDeals<T extends OrderableDeal>(deals: T[], mode: DealOrder, now: Date = new Date()): T[] {
  const newest = (a: T, b: T) => time(b.published_at, 0) - time(a.published_at, 0);
  const by: Record<DealOrder, (a: T, b: T) => number> = {
    manual: (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || newest(a, b),
    newest,
    // "Aktionsdatum": running deals ending soonest first, then upcoming ones starting soonest.
    schedule: (a, b) =>
      stage(a, now) - stage(b, now) ||
      (stage(a, now) === 1 ? time(a.sales_start, Infinity) - time(b.sales_start, Infinity) : time(a.sales_end, Infinity) - time(b.sales_end, Infinity)) ||
      newest(a, b),
    popular: (a, b) => (b.view_count ?? 0) - (a.view_count ?? 0) || newest(a, b),
    bestseller: (a, b) => b.sold_qty - a.sold_qty || newest(a, b),
  };
  return [...deals].sort((a, b) => Number(b.featured) - Number(a.featured) || by[mode](a, b));
}
