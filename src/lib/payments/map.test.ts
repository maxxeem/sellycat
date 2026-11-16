import { describe, expect, it } from "vitest";
import { accountState, authorizeUrl, checkoutError, checkoutInput, cleanSecret, connectStatus, maxQuantity, refundable, signState, stripeBranding, stripeDashboardUrl, verifyState } from "./map";

describe("payments map", () => {
  it("cleans pasted secrets", () => {
    expect(cleanSecret(' "sk_test_abc"\n')).toBe("sk_test_abc");
    expect(cleanSecret(undefined)).toBeUndefined();
    expect(cleanSecret("  ")).toBeUndefined();
  });

  it("maps a Stripe account", () => {
    const s = accountState({ charges_enabled: true, payouts_enabled: false, requirements: { currently_due: ["external_account"], past_due: ["external_account", "tos"] }, settings: { dashboard: { display_name: "Pizza" } }, country: "CH" });
    expect(s).toMatchObject({ charges_enabled: true, payouts_enabled: false, details_submitted: false, business_name: "Pizza", country: "CH" });
    expect(s.requirements).toEqual(["external_account", "tos"]);
    expect(connectStatus(null)).toBe("none");
    expect(connectStatus({ charges_enabled: false })).toBe("pending");
    expect(connectStatus(s)).toBe("active");
  });

  it("signs and verifies the OAuth state", () => {
    const state = { tenantId: "t", userId: "u", nonce: "n", exp: 2_000 };
    const token = signState(state, "secret");
    expect(verifyState(token, "secret", 1_000)).toEqual(state);
    expect(verifyState(token, "other", 1_000)).toBeNull();
    expect(verifyState(token, "secret", 3_000)).toBeNull();
    const [body] = token.split(".");
    expect(verifyState(`${body}.AAAA`, "secret", 1_000)).toBeNull();
    expect(verifyState("garbage", "secret")).toBeNull();
  });

  it("builds the authorize URL", () => {
    const url = new URL(authorizeUrl({ clientId: "ca_1", state: "s", redirectUri: "https://x/cb", email: "a@b.ch", country: "CH" }));
    expect(url.origin).toBe("https://connect.stripe.com");
    expect(url.searchParams.get("scope")).toBe("read_write");
    expect(url.searchParams.get("stripe_user[email]")).toBe("a@b.ch");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x/cb");
  });

  it("maps checkout errors", () => {
    expect(checkoutError('checkout:sold_out')).toBe("sold_out");
    expect(checkoutError("P0001: checkout:max_per_buyer")).toBe("max_per_buyer");
    expect(checkoutError("checkout:whatever")).toBe("failed");
    expect(checkoutError(null)).toBe("failed");
  });

  it("validates checkout input", () => {
    expect(checkoutInput.safeParse({ qty: "2", email: " A@B.CH ", terms: true }).data).toMatchObject({ qty: 2, email: "a@b.ch", name: "", newsletter: false });
    expect(checkoutInput.safeParse({ qty: 0, email: "a@b.ch", terms: true }).success).toBe(false);
    expect(checkoutInput.safeParse({ qty: 1, email: "nope", terms: true }).success).toBe(false);
    expect(checkoutInput.safeParse({ qty: 1, email: "a@b.ch", terms: false }).success).toBe(false);
  });

  it("limits the quantity", () => {
    expect(maxQuantity({ max_per_order: null, total_qty: null, sold_qty: 0, reserved_qty: 0 })).toBe(20);
    expect(maxQuantity({ max_per_order: 4, total_qty: 100, sold_qty: 0, reserved_qty: 0 })).toBe(4);
    expect(maxQuantity({ max_per_order: 4, total_qty: 10, sold_qty: 7, reserved_qty: 1 })).toBe(2);
    expect(maxQuantity({ max_per_order: null, total_qty: 5, sold_qty: 5, reserved_qty: 0 })).toBe(0);
    expect(refundable({ amount_cents: 5000, refunded_cents: 2000 })).toBe(3000);
  });

  it("links into the right Stripe dashboard", () => {
    expect(stripeDashboardUrl(false, "/payments/pi_1")).toBe("https://dashboard.stripe.com/test/payments/pi_1");
    expect(stripeDashboardUrl(true)).toBe("https://dashboard.stripe.com");
  });
});

describe("stripeBranding", () => {
  const theme = { colors: { primary: "#5b4cf5", surface: "#151c2c" }, fonts: { body: { source: "google", family: "Open Sans" } }, radius: 12, buttonStyle: "solid" as const };
  it("uses the shop's card colour and primary colour", () => {
    expect(stripeBranding(theme)).toEqual({ background_color: "#151c2c", button_color: "#5b4cf5", border_style: "rounded", font_family: "open_sans" });
  });
  it("maps corners and unknown fonts", () => {
    expect(stripeBranding({ ...theme, buttonStyle: "pill" }).border_style).toBe("pill");
    expect(stripeBranding({ ...theme, radius: 0 }).border_style).toBe("rectangular");
    expect(stripeBranding({ ...theme, fonts: { body: { source: "upload", family: "Brand Sans" } } }).font_family).toBe("default");
  });
});
