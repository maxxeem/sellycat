/**
 * Dashboard deal list: search, status filter and sorting (pure, tested; the page reads them from
 * the URL so a filtered view can be bookmarked or shared).
 */
import { dealStatus, isTeaser, type DealStatus, type DealStock } from "@/lib/shop/deal-status";

export const LIST_STATUSES = ["all", "live", "scheduled", "teaser", "draft", "sold_out", "ended", "archived"] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];
export const LIST_SORTS = ["created", "updated", "start", "ending", "sold", "views", "title", "price"] as const;
export type ListSort = (typeof LIST_SORTS)[number];

export type ListRow = DealStock & {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  price_cents: number;
  created_at: string;
  updated_at: string;
  view_count: number;
  archived_at?: string | null;
  partners: { name: string } | null;
};

export const parseListStatus = (v: unknown): ListStatus => LIST_STATUSES.find((s) => s === v) ?? "all";
export const parseListSort = (v: unknown): ListSort => LIST_SORTS.find((s) => s === v) ?? "created";

/** Archived deals only show under "Archiv"; every other chip (also "Alle") leaves them out. */
const matches = (status: ListStatus, d: ListRow, s: DealStatus, now: Date) =>
  d.archived_at ? status === "archived" : status === "all" || (status === "teaser" ? isTeaser(d, now) : s === status);

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Counts per status chip (before the status filter, after the search). */
export function listCounts(rows: ListRow[], q: string, now = new Date()): Record<ListStatus, number> {
  const found = search(rows, q);
  const out = Object.fromEntries(LIST_STATUSES.map((s) => [s, 0])) as Record<ListStatus, number>;
  for (const d of found) {
    const s = dealStatus(d, now);
    for (const k of LIST_STATUSES) if (matches(k, d, s, now)) out[k] += 1;
  }
  return out;
}

function search(rows: ListRow[], q: string): ListRow[] {
  const words = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter((d) => {
    const hay = norm([d.title, d.subtitle, d.slug, d.partners?.name].filter(Boolean).join(" "));
    return words.every((w) => hay.includes(w));
  });
}

const t = (iso: string | null, empty: number) => (iso ? new Date(iso).getTime() : empty);

export function filterAndSort(rows: ListRow[], opts: { q: string; status: ListStatus; sort: ListSort }, now = new Date()): ListRow[] {
  const list = search(rows, opts.q).filter((d) => matches(opts.status, d, dealStatus(d, now), now));
  const created = (a: ListRow, b: ListRow) => t(b.created_at, 0) - t(a.created_at, 0);
  const cmp: Record<ListSort, (a: ListRow, b: ListRow) => number> = {
    created,
    updated: (a, b) => t(b.updated_at, 0) - t(a.updated_at, 0),
    start: (a, b) => t(a.sales_start, Infinity) - t(b.sales_start, Infinity) || created(a, b),
    // Ending soon: deals with an end date that has not passed, soonest first; the rest after.
    ending: (a, b) => {
      const end = (d: ListRow) => (d.sales_end && t(d.sales_end, 0) > now.getTime() ? t(d.sales_end, 0) : Infinity);
      return end(a) - end(b) || created(a, b);
    },
    sold: (a, b) => b.sold_qty - a.sold_qty || created(a, b),
    views: (a, b) => b.view_count - a.view_count || created(a, b),
    title: (a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }),
    price: (a, b) => a.price_cents - b.price_cents || created(a, b),
  };
  return list.sort(cmp[opts.sort]);
}
