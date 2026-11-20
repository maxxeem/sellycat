import { describe, expect, it } from "vitest";
import { addDays, bucket, change, dayIn, parseRange, periods, totals, type DailyRow } from "./metrics";

const row = (day: string, p: Partial<DailyRow> = {}): DailyRow => ({
  day, revenue_cents: 0, fee_cents: 0, orders: 0, vouchers: 0, checkouts: 0, redemptions: 0, shop_views: 0, deal_views: 0, ...p,
});

describe("analytics metrics", () => {
  it("parses ranges with a safe default", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange("365")).toBe(365);
    expect(parseRange("12")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });

  it("computes days in a time zone and periods", () => {
    expect(dayIn(new Date("2026-11-20T23:30:00Z"), "Europe/Zurich")).toBe("2026-11-21");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(periods("2026-11-20", 7)).toEqual({
      current: { from: "2026-11-14", to: "2026-11-20" },
      previous: { from: "2026-11-07", to: "2026-11-13" },
    });
  });

  it("sums totals, conversion and average", () => {
    const t = totals([row("a", { revenue_cents: 3000, orders: 2, deal_views: 40 }), row("b", { revenue_cents: 1000, orders: 2, deal_views: 60 })]);
    expect(t.revenue_cents).toBe(4000);
    expect(t.conversion).toBeCloseTo(0.04);
    expect(t.averageCents).toBe(1000);
    expect(totals([]).conversion).toBeNull();
  });

  it("compares periods", () => {
    expect(change(150, 100)).toBeCloseTo(0.5);
    expect(change(5, 0)).toBeNull();
  });

  it("groups long periods into weeks ending today", () => {
    const rows = Array.from({ length: 90 }, (_, i) => row(addDays("2026-01-01", i), { orders: 1 }));
    const b = bucket(rows, 90);
    expect(b).toHaveLength(13);
    expect(b.at(-1)!.orders).toBe(7);
    expect(b[0].orders).toBe(6);
    expect(b.reduce((a, r) => a + r.orders, 0)).toBe(90);
  });
});
