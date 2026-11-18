import { describe, expect, it } from "vitest";
import { currencyForCountry, currencyFromStripe } from "./currency";
import { idsForMode, isDowngrade, planForPrice, stripeModeFor, tenantStateFromSubscription } from "./map";
import { bookable, feePercent, formatPrice, isFree, parseAmount, parsePercent, parsePlanPrices, toPlan, yearlyPerMonth } from "./plans";

const plans = [
  { id: "starter", stripe: { price_month_id: "p_s_m", price_year_id: "p_s_y" } },
  { id: "pro", stripe: { price_month_id: "p_p_m", price_year_id: "p_p_y" } },
];
const row = (o: Partial<Parameters<typeof toPlan>[0]> = {}) =>
  toPlan({ id: "starter", name: "Starter", sort_order: 1, is_public: true, contact_only: false, limits: { deals_live: 15, branding: false }, prices: { monthly: { CHF: 49, EUR: 49, USD: 49 }, yearly: { CHF: 468 } }, marketing: {}, application_fee_bps: 1000, application_fee_fixed: 0, trial_days: 7, ...o });

describe("billing", () => {
  it("picks the currency by country: CHF in CH/LI, EUR in Europe, USD elsewhere", () => {
    expect(currencyForCountry("CH")).toBe("CHF");
    expect(currencyForCountry("li")).toBe("CHF");
    expect(currencyForCountry("DE")).toBe("EUR");
    expect(currencyForCountry("GB")).toBe("EUR");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry("JP")).toBe("USD");
    expect(currencyForCountry(null)).toBe("CHF");
    expect(currencyFromStripe("eur")).toBe("EUR");
    expect(currencyFromStripe("gbp")).toBeNull();
  });

  it("reads prices, amounts and percentages as staff types them", () => {
    expect(parsePlanPrices({ monthly: { CHF: 49, EUR: "x", GBP: 3 }, yearly: { USD: -1 } })).toEqual({ monthly: { CHF: 49 }, yearly: {} });
    expect(parseAmount("49,90")).toBe(49.9);
    expect(parseAmount("1'428")).toBe(1428);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNaN();
    expect(parsePercent("2,5")).toBe(250);
    expect(parsePercent("10 %")).toBe(1000);
    expect(parsePercent("60")).toBeNaN();
    expect(feePercent(250)).toBe("2.5 %");
    expect(feePercent(3000)).toBe("30 %");
    expect(formatPrice(49, "EUR")).toBe("EUR 49.–");
  });

  it("knows free, bookable and the yearly monthly equivalent", () => {
    const starter = row();
    expect(isFree(starter)).toBe(false);
    expect(bookable(starter, "monthly", "USD")).toBe(true);
    expect(bookable(starter, "yearly", "USD")).toBe(false);
    expect(yearlyPerMonth(starter.prices, "CHF")).toBe(39);
    expect(isFree(row({ id: "free", prices: { monthly: { CHF: 0 } } }))).toBe(true);
    expect(bookable(row({ contact_only: true }), "monthly", "CHF")).toBe(false);
    expect(row().limits).toMatchObject({ deals_live: 15, seats: null, branding: false });
  });

  it("maps a subscription onto the shop; cancelled or unpaid falls back to Free", () => {
    expect(tenantStateFromSubscription({ status: "active", priceIds: ["p_p_y"], currentPeriodEnd: 1_800_000_000, cancelAtPeriodEnd: false, plans })).toMatchObject({ plan_id: "pro", billing_interval: "yearly", billing_status: "active" });
    expect(tenantStateFromSubscription({ status: "trialing", priceIds: ["p_s_m"], currentPeriodEnd: null, cancelAtPeriodEnd: false, plans })).toMatchObject({ plan_id: "starter", billing_status: "trialing" });
    expect(tenantStateFromSubscription({ status: "canceled", priceIds: ["p_p_m"], currentPeriodEnd: null, cancelAtPeriodEnd: false, plans })).toMatchObject({ plan_id: "free", billing_interval: null });
    expect(tenantStateFromSubscription({ status: "active", priceIds: ["unknown"], currentPeriodEnd: null, cancelAtPeriodEnd: false, plans })).toBeNull();
    expect(planForPrice("p_s_y", plans)).toEqual({ planId: "starter", interval: "yearly" });
  });

  it("upgrades now, downgrades at the period end", () => {
    const order = ["free", "starter", "pro", "business"];
    expect(isDowngrade(order, { planId: "pro", interval: "monthly" }, { planId: "starter", interval: "monthly" })).toBe(true);
    expect(isDowngrade(order, { planId: "starter", interval: "monthly" }, { planId: "pro", interval: "monthly" })).toBe(false);
    expect(isDowngrade(order, { planId: "pro", interval: "yearly" }, { planId: "pro", interval: "monthly" })).toBe(true);
    expect(isDowngrade(order, { planId: "pro", interval: "monthly" }, { planId: "pro", interval: "yearly" })).toBe(false);
  });

  it("keeps test and live ids apart", () => {
    expect(stripeModeFor("sk_live_x")).toBe("live");
    expect(stripeModeFor("sk_test_x")).toBe("test");
    expect(idsForMode({ test: { product_id: "a" }, live: { product_id: "b" } }, "live")).toEqual({ product_id: "b" });
    expect(idsForMode(null, "test")).toEqual({});
  });
});
