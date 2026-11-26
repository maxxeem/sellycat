import { describe, expect, it } from "vitest";
import { generatePartnerCode, normalizePartnerCode, validPartnerCode } from "./partner-code-rules";

describe("partner code", () => {
  it("ignores spaces, dashes and case", () => {
    expect(normalizePartnerCode(" ab12-cd 34 ")).toBe("AB12CD34");
  });
  it("accepts 8 to 32 letters or digits", () => {
    expect(validPartnerCode("1234567")).toBe(false);
    expect(validPartnerCode("12345678")).toBe(true);
    expect(validPartnerCode("A".repeat(32))).toBe(true);
    expect(validPartnerCode("A".repeat(33))).toBe(false);
    expect(validPartnerCode("ÄBCDEFGH")).toBe(false);
  });
  it("generates valid eight-digit codes", () => {
    for (let i = 0; i < 50; i++) {
      const c = generatePartnerCode();
      expect(c).toMatch(/^\d{8}$/);
      expect(validPartnerCode(c)).toBe(true);
    }
  });
});
