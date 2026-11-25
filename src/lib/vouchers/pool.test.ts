import { describe, expect, it } from "vitest";
import { remaining, stockTotal } from "@/lib/shop/deal-status";
import { parsePoolCodes, poolLevel, poolShortage } from "./pool";

describe("parsePoolCodes", () => {
  it("reads one code per line and skips blanks and duplicates", () => {
    expect(parsePoolCodes("A1\n\nB2\r\nA1\n  C3  \n")).toEqual({ codes: ["A1", "B2", "C3"], duplicates: 1, tooLong: 0, header: false });
  });

  it("takes the first CSV column, strips quotes and skips a header", () => {
    const r = parsePoolCodes('﻿Code;Wert\n"X-1";10\nX-2,20\nX-3\t30');
    expect(r.header).toBe(true);
    expect(r.codes).toEqual(["X-1", "X-2", "X-3"]);
  });

  it("drops codes that are too long", () => {
    expect(parsePoolCodes(`${"a".repeat(121)}\nok`)).toMatchObject({ codes: ["ok"], tooLong: 1 });
  });
});

describe("poolShortage", () => {
  it("compares the quantity with the codes", () => {
    expect(poolShortage(50, 0, 1)).toBe(1);
    expect(poolShortage(50, 10, 20, 20)).toBeNull();
    expect(poolShortage(null, 0, 0)).toBeNull();
    expect(stockTotal({ total_qty: 50, sold_qty: 2, reserved_qty: 1, code_source: "pool", pool_free: 4 })).toBe(6);
    expect(stockTotal({ total_qty: 50, sold_qty: 2, reserved_qty: 0, code_source: "shared", pool_free: 0 })).toBe(50);
    expect(stockTotal({ total_qty: null, sold_qty: 2, reserved_qty: 0, code_source: "pool", pool_free: 3 })).toBeNull();
  });
});

describe("poolLevel", () => {
  it("warns when few codes are left", () => {
    expect(poolLevel(0, 50)).toBe("empty");
    expect(poolLevel(9, 0)).toBe("low");
    expect(poolLevel(40, 460)).toBe("low");
    expect(poolLevel(60, 440)).toBe("ok");
  });
});

describe("remaining with a code pool", () => {
  const base = { total_qty: null, sold_qty: 0, reserved_qty: 2 };
  it("ignores the pool for generated codes", () => {
    expect(remaining({ ...base, code_source: "generated", pool_free: 0 })).toBeNull();
  });
  it("sells only free codes minus reservations (auto-stop)", () => {
    expect(remaining({ ...base, code_source: "pool", pool_free: 5 })).toBe(3);
    expect(remaining({ ...base, code_source: "pool", pool_free: 1 })).toBe(0);
    expect(remaining({ ...base, total_qty: 3, code_source: "pool", pool_free: 50 })).toBe(1);
  });
});
