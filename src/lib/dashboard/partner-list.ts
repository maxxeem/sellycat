/**
 * Dashboard partner list: search, filter chips, city and sorting (pure, tested; the page reads
 * them from the URL like the deal list).
 */
import { dealStatus, type DealStock } from "@/lib/shop/deal-status";

export const PARTNER_FILTERS = ["all", "live", "no_deals", "no_locations"] as const;
export type PartnerFilter = (typeof PARTNER_FILTERS)[number];
export const PARTNER_SORTS = ["name", "created", "live", "sold"] as const;
export type PartnerSort = (typeof PARTNER_SORTS)[number];

export type PartnerDeal = DealStock & { title: string; archived_at: string | null };
export type PartnerRow = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  partner_locations: Array<{ name: string; city: string | null }>;
  deals: PartnerDeal[];
};

export const parsePartnerFilter = (v: unknown): PartnerFilter => PARTNER_FILTERS.find((s) => s === v) ?? "all";
export const parsePartnerSort = (v: unknown): PartnerSort => PARTNER_SORTS.find((s) => s === v) ?? "name";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Facts shown in the list and used for filters (archived deals don't count). */
export function partnerFacts(p: PartnerRow, now = new Date()) {
  const deals = p.deals.filter((d) => !d.archived_at);
  return {
    deals: deals.length,
    live: deals.filter((d) => dealStatus(d, now) === "live").length,
    sold: deals.reduce((a, d) => a + d.sold_qty, 0),
    locations: p.partner_locations.length,
    cities: [...new Set(p.partner_locations.map((l) => l.city?.trim()).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "de")),
  };
}

const matches = (f: PartnerFilter, x: ReturnType<typeof partnerFacts>) =>
  f === "all" || (f === "live" && x.live > 0) || (f === "no_deals" && x.deals === 0) || (f === "no_locations" && x.locations === 0);

function search(rows: PartnerRow[], q: string, city: string): PartnerRow[] {
  const words = norm(q.trim()).split(/\s+/).filter(Boolean);
  const c = norm(city.trim());
  return rows.filter((p) => {
    if (c && !p.partner_locations.some((l) => norm(l.city ?? "") === c)) return false;
    if (!words.length) return true;
    const hay = norm([p.name, p.email, ...p.partner_locations.flatMap((l) => [l.name, l.city]), ...p.deals.map((d) => d.title)].filter(Boolean).join(" "));
    return words.every((w) => hay.includes(w));
  });
}

/** All cities of the shop's partners (for the city filter). */
export function partnerCities(rows: PartnerRow[]): string[] {
  return [...new Set(rows.flatMap((p) => p.partner_locations.map((l) => l.city?.trim()).filter((c): c is string => Boolean(c))))].sort((a, b) => a.localeCompare(b, "de"));
}

export function partnerCounts(rows: PartnerRow[], q: string, city: string, now = new Date()): Record<PartnerFilter, number> {
  const out = Object.fromEntries(PARTNER_FILTERS.map((s) => [s, 0])) as Record<PartnerFilter, number>;
  for (const p of search(rows, q, city)) {
    const x = partnerFacts(p, now);
    for (const f of PARTNER_FILTERS) if (matches(f, x)) out[f] += 1;
  }
  return out;
}

export function filterPartners(rows: PartnerRow[], opts: { q: string; filter: PartnerFilter; city: string; sort: PartnerSort }, now = new Date()): PartnerRow[] {
  const facts = new Map(rows.map((p) => [p.id, partnerFacts(p, now)]));
  const byName = (a: PartnerRow, b: PartnerRow) => a.name.localeCompare(b.name, "de", { sensitivity: "base" });
  const cmp: Record<PartnerSort, (a: PartnerRow, b: PartnerRow) => number> = {
    name: byName,
    created: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    live: (a, b) => facts.get(b.id)!.live - facts.get(a.id)!.live || byName(a, b),
    sold: (a, b) => facts.get(b.id)!.sold - facts.get(a.id)!.sold || byName(a, b),
  };
  return search(rows, opts.q, opts.city)
    .filter((p) => matches(opts.filter, facts.get(p.id)!))
    .sort(cmp[opts.sort]);
}
