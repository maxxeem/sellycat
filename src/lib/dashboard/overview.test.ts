import { describe, expect, it } from "vitest";
import { summarise, trend, type OverviewOrder } from "./overview";

const now = new Date("2026-11-17T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const order = (days: number, cents: number, qty = 1, refunded = 0, deal = "a"): OverviewOrder => ({
  paid_at: ago(days),
  amount_cents: cents,
  refunded_cents: refunded,
  order_items: [{ title: `Deal ${deal}`, qty, deal_id: deal }],
});

describe("summarise", () => {
  it("splits current and previous span, net of refunds", () => {
    const s = summarise([order(1, 2000, 2), order(3, 1000, 1, 500, "b"), order(40, 3000), { ...order(2, 999), paid_at: null }], now);
    expect(s.revenue).toEqual({ value: 2500, previous: 3000 });
    expect(s.orders).toEqual({ value: 2, previous: 1 });
    expect(s.vouchers).toEqual({ value: 3, previous: 1 });
    expect(s.top).toEqual([{ title: "Deal a", qty: 2 }, { title: "Deal b", qty: 1 }]);
  });

  it("has one entry per day, oldest first, today last", () => {
    const s = summarise([order(0, 1500)], now, 7);
    expect(s.daily).toHaveLength(7);
    expect(s.daily.at(-1)).toEqual({ day: "2026-11-17", cents: 1500 });
    expect(s.daily[0].cents).toBe(0);
  });

  it("ignores orders older than two spans", () => {
    expect(summarise([order(61, 1000)], now).orders).toEqual({ value: 0, previous: 0 });
  });
});

describe("trend", () => {
  it("is a rounded percentage or null", () => {
    expect(trend({ value: 150, previous: 100 })).toBe(50);
    expect(trend({ value: 0, previous: 0 })).toBeNull();
  });
});
