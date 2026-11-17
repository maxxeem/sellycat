import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, designFromRow, designQuery, designToRow, parseDesign } from "./design";

describe("voucher design", () => {
  it("falls back to the default for unknown values", () => {
    expect(parseDesign({ layout: "fancy", size: "a3", accent: "red", note: "   " })).toEqual(DEFAULT_DESIGN);
  });

  it("round-trips through the preview query string", () => {
    const d = parseDesign({ layout: "ticket", size: "a6", accent: "#0A7CFF", showImage: false, showLocations: true, showTerms: false, note: "Bitte reservieren" });
    expect(d.accent).toBe("#0a7cff");
    expect(parseDesign(Object.fromEntries(new URLSearchParams(designQuery(d))))).toEqual(d);
  });

  it("round-trips through a database row and caps the note", () => {
    const d = parseDesign({ layout: "minimal", note: "x".repeat(900) });
    expect(d.note).toHaveLength(400);
    expect(designFromRow({ ...designToRow(d) })).toEqual(d);
    expect(designFromRow(null)).toEqual(DEFAULT_DESIGN);
  });
});
