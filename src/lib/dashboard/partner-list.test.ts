import { describe, expect, it } from "vitest";
import { filterPartners, partnerCities, partnerCounts, partnerFacts, type PartnerDeal, type PartnerRow } from "./partner-list";

const now = new Date("2026-11-20T12:00:00Z");
const deal = (p: Partial<PartnerDeal> = {}): PartnerDeal => ({
  title: "Deal", state: "published", sales_start: null, sales_end: null, total_qty: null, sold_qty: 0, reserved_qty: 0, archived_at: null, ...p,
} as PartnerDeal);
const partner = (id: string, name: string, p: Partial<PartnerRow> = {}): PartnerRow => ({ id, name, email: null, created_at: "2026-11-01T00:00:00Z", partner_locations: [], deals: [], ...p });

const rows = [
  partner("a", "Santa Lucia", { partner_locations: [{ name: "Teatro", city: "Zürich" }, { name: "Bern", city: "Bern" }], deals: [deal({ title: "Pizza", sold_qty: 5 })], created_at: "2026-11-02T00:00:00Z" }),
  partner("b", "Aare Adventure Park", { partner_locations: [{ name: "Park", city: "Bern" }], deals: [deal({ state: "draft", sold_qty: 9 })] }),
  partner("c", "Café Ohne", { deals: [deal({ archived_at: "2026-11-10T00:00:00Z" })], created_at: "2026-11-05T00:00:00Z" }),
];

describe("partner list", () => {
  it("knows the facts per partner (archived deals don't count)", () => {
    expect(partnerFacts(rows[0], now)).toMatchObject({ deals: 1, live: 1, sold: 5, locations: 2, cities: ["Bern", "Zürich"] });
    expect(partnerFacts(rows[2], now)).toMatchObject({ deals: 0, live: 0 });
  });

  it("searches name, places and deal titles without accents", () => {
    expect(filterPartners(rows, { q: "zurich", filter: "all", city: "", sort: "name" }, now).map((p) => p.id)).toEqual(["a"]);
    expect(filterPartners(rows, { q: "pizza", filter: "all", city: "", sort: "name" }, now).map((p) => p.id)).toEqual(["a"]);
    expect(filterPartners(rows, { q: "cafe", filter: "all", city: "", sort: "name" }, now).map((p) => p.id)).toEqual(["c"]);
  });

  it("filters by chips and city, counts per chip", () => {
    expect(filterPartners(rows, { q: "", filter: "live", city: "", sort: "name" }, now).map((p) => p.id)).toEqual(["a"]);
    expect(filterPartners(rows, { q: "", filter: "no_deals", city: "", sort: "name" }, now).map((p) => p.id)).toEqual(["c"]);
    expect(filterPartners(rows, { q: "", filter: "no_locations", city: "", sort: "name" }, now).map((p) => p.id)).toEqual(["c"]);
    expect(filterPartners(rows, { q: "", filter: "all", city: "Bern", sort: "name" }, now).map((p) => p.id)).toEqual(["b", "a"]);
    expect(partnerCounts(rows, "", "", now)).toEqual({ all: 3, live: 1, no_deals: 1, no_locations: 1 });
    expect(partnerCities(rows)).toEqual(["Bern", "Zürich"]);
  });

  it("sorts by name, newest, live deals and sold vouchers", () => {
    const ids = (sort: "name" | "created" | "live" | "sold") => filterPartners(rows, { q: "", filter: "all", city: "", sort }, now).map((p) => p.id);
    expect(ids("name")).toEqual(["b", "c", "a"]);
    expect(ids("created")).toEqual(["c", "a", "b"]);
    expect(ids("live")[0]).toBe("a");
    expect(ids("sold")).toEqual(["b", "a", "c"]);
  });
});
