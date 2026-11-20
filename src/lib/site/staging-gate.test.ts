import { describe, expect, it } from "vitest";
import { stagingExempt } from "./staging-gate";

describe("staging gate", () => {
  it("lets machine callers through (they have no password), nothing else", () => {
    expect(stagingExempt("/api/stripe/webhook")).toBe(true);
    expect(stagingExempt("/api/stripe/billing")).toBe(true);
    expect(stagingExempt("/api/cron/reservations")).toBe(true);
    expect(stagingExempt("/api/health")).toBe(true);
    expect(stagingExempt("/api/v1")).toBe(true);
    expect(stagingExempt("/api/v1/vouchers/ABC/redeem")).toBe(true);
    expect(stagingExempt("/api/v1x")).toBe(false);
    expect(stagingExempt("/api/stripe/connect/callback")).toBe(false);
    expect(stagingExempt("/dashboard")).toBe(false);
    expect(stagingExempt("/checkout/x")).toBe(false);
  });
});
