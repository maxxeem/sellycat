import { describe, expect, it } from "vitest";
import { dealStatus, describeWindows, formatMoney, isListed, isTeaser, parseMoney, remaining, savingsPercent, withinWindows, type DealStock } from "./deal-status";

const base: DealStock = { state: "published", sales_start: null, sales_end: null, total_qty: null, sold_qty: 0, reserved_qty: 0 };
const now = new Date("2026-12-01T12:00:00Z");

describe("dealStatus", () => {
  it("follows the editorial state", () => {
    expect(dealStatus({ ...base, state: "draft" }, now)).toBe("draft");
    expect(dealStatus({ ...base, state: "ended" }, now)).toBe("ended");
    expect(dealStatus(base, now)).toBe("live");
  });
  it("respects the sales window", () => {
    expect(dealStatus({ ...base, sales_start: "2026-12-02T00:00:00Z" }, now)).toBe("scheduled");
    expect(dealStatus({ ...base, sales_end: "2026-12-01T11:59:59Z" }, now)).toBe("ended");
  });
  it("is sold out when nothing is left", () => {
    expect(dealStatus({ ...base, total_qty: 10, sold_qty: 10 }, now)).toBe("sold_out");
    expect(dealStatus({ ...base, total_qty: 10, sold_qty: 8, reserved_qty: 2 }, now)).toBe("sold_out");
    expect(dealStatus({ ...base, total_qty: 10, sold_qty: 8 }, now)).toBe("live");
  });
  it("lists live, sold out and scheduled deals only", () => {
    expect(isListed({ ...base, state: "draft" }, now)).toBe(false);
    expect(isListed({ ...base, total_qty: 1, sold_qty: 1 }, now)).toBe(true);
  });
});

describe("money", () => {
  it("computes remaining stock", () => {
    expect(remaining({ total_qty: null, sold_qty: 5, reserved_qty: 0 })).toBeNull();
    expect(remaining({ total_qty: 5, sold_qty: 4, reserved_qty: 3 })).toBe(0);
  });
  it("formats Swiss francs", () => {
    expect(formatMoney(2000, "CHF", "de")).toMatch(/CHF.?20/);
    expect(formatMoney(1250, "CHF", "de")).toMatch(/12[.,]50/);
  });
  it("rounds savings down", () => {
    expect(savingsPercent(2000, 4000)).toBe(50);
    expect(savingsPercent(2999, 4000)).toBe(25);
    expect(savingsPercent(2000, null)).toBeNull();
  });
  it("parses typed prices", () => {
    expect(parseMoney("12.50")).toBe(1250);
    expect(parseMoney("12,5")).toBe(1250);
    expect(parseMoney("1’000")).toBe(100000);
    expect(parseMoney("12.–")).toBe(1200);
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("redemption windows", () => {
  const lunch = [{ days: [1, 2, 3, 4, 5], from: "11:00", to: "14:00" }];
  it("describes windows", () => expect(describeWindows(lunch, "de")).toEqual(["Mo–Fr 11:00–14:00"]));
  it("checks Zurich wall time", () => {
    expect(withinWindows(lunch, new Date("2026-12-01T11:30:00Z"))).toBe(true); // Tue 12:30 in Zurich
    expect(withinWindows(lunch, new Date("2026-12-01T14:30:00Z"))).toBe(false); // 15:30
    expect(withinWindows(lunch, new Date("2026-12-05T11:30:00Z"))).toBe(false); // Saturday
    expect(withinWindows([], now)).toBe(true);
  });
});

describe("teaser", () => {
  const base = { state: "published" as const, sales_end: null, total_qty: null, sold_qty: 0, reserved_qty: 0 };
  const now = new Date("2026-11-20T10:00:00Z");
  it("is a teaser only before the sales start", () => {
    expect(isTeaser({ ...base, teaser: true, sales_start: "2026-12-01T08:00:00Z" }, now)).toBe(true);
    expect(isTeaser({ ...base, teaser: true, sales_start: "2026-11-01T08:00:00Z" }, now)).toBe(false);
    expect(isTeaser({ ...base, teaser: false, sales_start: "2026-12-01T08:00:00Z" }, now)).toBe(false);
    expect(isTeaser({ ...base, state: "draft", teaser: true, sales_start: "2026-12-01T08:00:00Z" }, now)).toBe(false);
  });
});
