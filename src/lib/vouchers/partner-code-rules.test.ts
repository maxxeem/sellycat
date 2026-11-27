import { describe, expect, it } from "vitest";
import { generatePartnerCode, normalizePartnerCode, validPartnerCode } from "./partner-code-rules";

describe("partner code", () => {
  it("ignores spaces and dashes", () => {
    expect(normalizePartnerCode(" 12-34 56 ")).toBe("123456");
  });
  it("accepts 4 to 8 digits only", () => {
    expect(validPartnerCode("123")).toBe(false);
    expect(validPartnerCode("1234")).toBe(true);
    expect(validPartnerCode("12345678")).toBe(true);
    expect(validPartnerCode("123456789")).toBe(false);
    expect(validPartnerCode("12AB")).toBe(false);
  });
  it("generates valid six-digit codes", () => {
    for (let i = 0; i < 50; i++) {
      const c = generatePartnerCode();
      expect(c).toMatch(/^\d{6}$/);
      expect(validPartnerCode(c)).toBe(true);
    }
  });
});
