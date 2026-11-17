import { describe, expect, it } from "vitest";
import { formatValue, joinValue, monthGrid, shiftMonth, splitValue, zurichNow } from "./date-picker";

describe("date picker helpers", () => {
  it("knows the Zurich wall-clock time, summer and winter", () => {
    expect(zurichNow(new Date("2026-07-01T10:05:00Z"))).toEqual({ date: "2026-07-01", time: "12:05" });
    expect(zurichNow(new Date("2026-12-31T23:30:00Z"))).toEqual({ date: "2027-01-01", time: "00:30" });
  });

  it("splits and joins values like the native inputs", () => {
    expect(splitValue("2026-11-23T14:30", "datetime")).toEqual({ date: "2026-11-23", time: "14:30" });
    expect(joinValue("2026-11-23", null, "datetime")).toBe("2026-11-23T00:00");
    expect(joinValue("2026-11-23", "09:15", "date")).toBe("2026-11-23");
    expect(splitValue("", "datetime")).toEqual({ date: null, time: null });
  });

  it("builds Monday-first month grids", () => {
    const nov = monthGrid(2026, 10);
    expect(nov[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(nov.flat().filter(Boolean)).toHaveLength(30);
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("formats for the field", () => {
    expect(formatValue("2026-11-23T14:30", "datetime", "de")).toBe("23. November 2026, 14:30");
    expect(formatValue("2026-11-23", "date", "en")).toBe("23 November 2026");
  });
});
