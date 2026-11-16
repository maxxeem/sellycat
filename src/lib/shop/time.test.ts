import { describe, expect, it } from "vitest";
import { isoToZurichLocal, zurichLocalToIso } from "./time";

describe("Zurich time", () => {
  it("converts winter time (UTC+1)", () => {
    expect(zurichLocalToIso("2026-12-24T18:00")).toBe("2026-12-24T17:00:00.000Z");
    expect(isoToZurichLocal("2026-12-24T17:00:00.000Z")).toBe("2026-12-24T18:00");
  });
  it("converts summer time (UTC+2)", () => {
    expect(zurichLocalToIso("2026-07-01T09:30")).toBe("2026-07-01T07:30:00.000Z");
    expect(isoToZurichLocal("2026-07-01T07:30:00Z")).toBe("2026-07-01T09:30");
  });
  it("survives the DST switch", () => {
    expect(isoToZurichLocal(zurichLocalToIso("2026-03-29T04:00"))).toBe("2026-03-29T04:00");
    expect(isoToZurichLocal(zurichLocalToIso("2026-10-25T12:00"))).toBe("2026-10-25T12:00");
  });
  it("handles empty input", () => {
    expect(zurichLocalToIso("")).toBeNull();
    expect(isoToZurichLocal(null)).toBe("");
  });
});
