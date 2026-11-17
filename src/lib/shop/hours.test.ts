import { describe, expect, it } from "vitest";
import { copyDay, emptyHours, formatHours, fromGooglePeriods, parseHours } from "./hours";

describe("opening hours", () => {
  it("keeps only valid ranges, sorted", () => {
    const h = parseHours({ "1": [{ from: "14:00", to: "18:00" }, { from: "09:00", to: "12:00" }, { from: "25:00", to: "26:00" }], "2": "x" });
    expect(h?.["1"]).toEqual([{ from: "09:00", to: "12:00" }, { from: "14:00", to: "18:00" }]);
    expect(h?.["2"]).toEqual([]);
    expect(parseHours(null)).toBeNull();
    expect(parseHours("Mo-Fr 9-18")).toBeNull();
  });

  it("converts Google periods (Sunday = 0, past midnight, around the clock)", () => {
    const h = fromGooglePeriods([
      { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 18, minute: 30 } },
      { open: { day: 5, hour: 18, minute: 0 }, close: { day: 6, hour: 2, minute: 0 } },
      { open: { day: 0, hour: 10, minute: 0 }, close: { day: 0, hour: 16, minute: 0 } },
    ]);
    expect(h?.["1"]).toEqual([{ from: "09:00", to: "18:30" }]);
    expect(h?.["5"]).toEqual([{ from: "18:00", to: "02:00" }]);
    expect(h?.["7"]).toEqual([{ from: "10:00", to: "16:00" }]);
    expect(h?.["3"]).toEqual([]);
    expect(fromGooglePeriods([{ open: { day: 0, hour: 0, minute: 0 } }])?.["4"]).toEqual([{ from: "00:00", to: "23:59" }]);
  });

  it("groups identical days for display", () => {
    const week = copyDay({ ...emptyHours(), "1": [{ from: "09:00", to: "18:00" }] }, "1", ["2", "3", "4", "5"]);
    week["6"] = [{ from: "10:00", to: "16:00" }];
    expect(formatHours(week, "de")).toEqual(["Mo–Fr 09:00–18:00", "Sa 10:00–16:00", "So geschlossen"]);
    expect(formatHours({ ...week, "7": [{ from: "00:00", to: "23:59" }] }, "en")).toEqual(["Mon–Fri 09:00–18:00", "Sat 10:00–16:00", "Sun 00:00–24:00"]);
  });
});
