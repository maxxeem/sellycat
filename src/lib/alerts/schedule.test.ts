import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE, nextSlot, parseSchedule, scheduleFromRow, scheduleToRow } from "./schedule";

const s = { mode: "scheduled" as const, window: null, weekdays: [1, 4], sendAt: "09:00" };

describe("deal alert schedule", () => {
  it("validates", () => {
    expect(parseSchedule({ ...s, weekdays: [4, 1, 1, 9] })).toEqual({ ok: true, value: s });
    expect(parseSchedule({ ...s, mode: "x" })).toEqual({ ok: false, error: "mode" });
    expect(parseSchedule({ ...s, weekdays: [] })).toEqual({ ok: false, error: "weekdays" });
    expect(parseSchedule({ ...s, sendAt: "25:00" })).toEqual({ ok: false, error: "time" });
    expect(parseSchedule({ ...s, mode: "instant", window: { from: "20:00", to: "08:00" } })).toEqual({ ok: false, error: "window" });
  });
  it("round-trips the database row", () => {
    for (const v of [s, { ...s, mode: "instant" as const, window: { from: "08:00", to: "20:00" } }, DEFAULT_SCHEDULE]) {
      const r = scheduleToRow(v);
      expect(scheduleFromRow({ ...r, window_from: `${r.window_from}:00`, window_to: `${r.window_to}:00`, send_at: `${r.send_at}:00` })).toEqual(v);
    }
    expect(scheduleFromRow(null)).toEqual(DEFAULT_SCHEDULE);
  });
  it("finds the next sending time (Zurich)", () => {
    // Wednesday 25 Nov 2026 → Thursday 09:00 (winter, UTC+1).
    expect(nextSlot(s, new Date("2026-11-25T10:00:00Z"))?.toISOString()).toBe("2026-11-26T08:00:00.000Z");
    expect(nextSlot(s, new Date("2026-11-26T08:00:00Z"))?.toISOString()).toBe("2026-11-30T08:00:00.000Z");
    expect(nextSlot({ ...s, weekdays: [3] }, new Date("2026-11-25T10:00:00Z"))?.toISOString()).toBe("2026-12-02T08:00:00.000Z");
    expect(nextSlot({ ...s, mode: "manual" }, new Date())).toBeNull();
  });
});
