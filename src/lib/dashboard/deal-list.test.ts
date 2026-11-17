import { describe, expect, it } from "vitest";
import { filterAndSort, listCounts, parseListSort, parseListStatus, type ListRow } from "./deal-list";

const now = new Date("2026-11-25T12:00:00Z");
const row = (id: string, o: Partial<ListRow> = {}): ListRow => ({
  id,
  title: id,
  subtitle: null,
  slug: id,
  state: "published",
  sales_start: null,
  sales_end: null,
  total_qty: null,
  sold_qty: 0,
  reserved_qty: 0,
  price_cents: 1000,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  view_count: 0,
  partners: null,
  ...o,
});

const rows = [
  row("Pizza Abend", { partners: { name: "Santa Lucia" }, sold_qty: 40, view_count: 10, created_at: "2026-11-03T00:00:00Z", price_cents: 3900, sales_end: "2026-12-01T00:00:00Z" }),
  row("Brunch für zwei", { partners: { name: "Café Zytglogge" }, sold_qty: 5, view_count: 90, created_at: "2026-11-10T00:00:00Z", price_cents: 5900, sales_end: "2026-11-27T00:00:00Z" }),
  row("Spa Tag", { state: "draft", created_at: "2026-11-20T00:00:00Z", price_cents: 18900 }),
  row("Kino Teaser", { teaser: true, sales_start: "2026-12-05T00:00:00Z", created_at: "2026-11-15T00:00:00Z", price_cents: 1500 }),
  row("Alt", { state: "ended", created_at: "2026-10-01T00:00:00Z" }),
  row("Archiviert", { state: "ended", archived_at: "2026-11-20T00:00:00Z", created_at: "2026-09-01T00:00:00Z" }),
];
const ids = (l: ListRow[]) => l.map((r) => r.title);

describe("dashboard deal list", () => {
  it("searches title and partner, ignoring case and accents", () => {
    expect(ids(filterAndSort(rows, { q: "santa", status: "all", sort: "created" }, now))).toEqual(["Pizza Abend"]);
    expect(ids(filterAndSort(rows, { q: "cafe zyt", status: "all", sort: "created" }, now))).toEqual(["Brunch für zwei"]);
  });
  it("filters by status, teasers included", () => {
    expect(ids(filterAndSort(rows, { q: "", status: "live", sort: "created" }, now))).toEqual(["Brunch für zwei", "Pizza Abend"]);
    expect(ids(filterAndSort(rows, { q: "", status: "teaser", sort: "created" }, now))).toEqual(["Kino Teaser"]);
    expect(listCounts(rows, "", now)).toMatchObject({ all: 5, live: 2, scheduled: 1, teaser: 1, draft: 1, ended: 1, sold_out: 0, archived: 1 });
  });
  it("sorts by the chosen value", () => {
    expect(ids(filterAndSort(rows, { q: "", status: "all", sort: "created" }, now))[0]).toBe("Spa Tag");
    expect(ids(filterAndSort(rows, { q: "", status: "all", sort: "sold" }, now))[0]).toBe("Pizza Abend");
    expect(ids(filterAndSort(rows, { q: "", status: "all", sort: "views" }, now))[0]).toBe("Brunch für zwei");
    expect(ids(filterAndSort(rows, { q: "", status: "live", sort: "ending" }, now))).toEqual(["Brunch für zwei", "Pizza Abend"]);
    expect(ids(filterAndSort(rows, { q: "", status: "all", sort: "price" }, now))[0]).toBe("Alt");
    expect(ids(filterAndSort(rows, { q: "", status: "all", sort: "title" }, now))[0]).toBe("Alt");
  });
  it("keeps archived deals out of every list but the archive", () => {
    expect(ids(filterAndSort(rows, { q: "", status: "all", sort: "created" }, now))).not.toContain("Archiviert");
    expect(ids(filterAndSort(rows, { q: "", status: "ended", sort: "created" }, now))).toEqual(["Alt"]);
    expect(ids(filterAndSort(rows, { q: "", status: "archived", sort: "created" }, now))).toEqual(["Archiviert"]);
  });
  it("falls back to sensible defaults for unknown URL values", () => {
    expect(parseListStatus("x")).toBe("all");
    expect(parseListSort(undefined)).toBe("created");
  });
});
