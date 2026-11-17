import { describe, expect, it } from "vitest";
import { parseDealOrder, sortDeals, type OrderableDeal } from "./deal-order";

const now = new Date("2026-11-25T12:00:00Z");
const deal = (id: string, o: Partial<OrderableDeal> = {}): OrderableDeal => ({
  id,
  featured: false,
  state: "published",
  sales_start: null,
  sales_end: null,
  total_qty: null,
  sold_qty: 0,
  reserved_qty: 0,
  sort_order: 0,
  published_at: "2026-11-01T00:00:00Z",
  view_count: 0,
  ...o,
});
const ids = (list: OrderableDeal[]) => list.map((d) => d.id);

describe("sortDeals", () => {
  const a = deal("a", { sort_order: 2, published_at: "2026-11-20T00:00:00Z", view_count: 5, sold_qty: 30 });
  const b = deal("b", { sort_order: 1, published_at: "2026-11-10T00:00:00Z", view_count: 50, sold_qty: 3, sales_end: "2026-11-27T00:00:00Z" });
  const c = deal("c", { sort_order: 3, published_at: "2026-11-15T00:00:00Z", view_count: 9, sold_qty: 12, sales_end: "2026-12-31T00:00:00Z" });
  const soon = deal("soon", { sort_order: 0, published_at: "2026-11-24T00:00:00Z", sales_start: "2026-11-28T00:00:00Z" });
  const top = deal("top", { featured: true, sort_order: 9, published_at: "2026-10-01T00:00:00Z" });
  const all = [a, b, c, soon, top];

  it("keeps the top deal first in every mode", () => {
    for (const m of ["manual", "newest", "schedule", "popular", "bestseller"] as const) expect(sortDeals(all, m, now)[0].id).toBe("top");
  });
  it("manual: by drag & drop position", () => expect(ids(sortDeals(all, "manual", now))).toEqual(["top", "soon", "b", "a", "c"]));
  it("newest: by publishing date", () => expect(ids(sortDeals(all, "newest", now))).toEqual(["top", "soon", "a", "c", "b"]));
  it("schedule: running deals ending soonest, open-ended after them, then upcoming ones", () => expect(ids(sortDeals(all, "schedule", now))).toEqual(["top", "b", "c", "a", "soon"]));
  it("popular: most opened first", () => expect(ids(sortDeals(all, "popular", now))).toEqual(["top", "b", "c", "a", "soon"]));
  it("bestseller: most sold first", () => expect(ids(sortDeals(all, "bestseller", now))).toEqual(["top", "a", "c", "b", "soon"]));
  it("falls back to manual for unknown settings", () => expect(parseDealOrder("random")).toBe("manual"));
});
