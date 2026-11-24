import { describe, expect, it } from "vitest";
import { dealRow, dealToForm, slugifyTitle, validateDeal, type DealForm } from "./deal-input";

const form: DealForm = {
  title: "2 Pizzas", subtitle: "", slug: "2-pizzas", description: null, terms: "", faq: [], partnerId: "", categoryId: "", locationIds: [], images: [],
  dealType: "fixed", price: "20", compareAt: "40", value: "", partial: false, totalQty: "100", maxPerOrder: "4", maxPerBuyer: "", salesStart: "2026-12-01T09:00",
  salesEnd: "2026-12-31T23:59", redeemValidity: "days_after_purchase", redeemUntil: "", redeemDays: "90", windows: [{ days: [1, 2, 3, 4, 5], from: "11:00", to: "14:00" }],
  codeFormat: "qr", barcodeType: "", codeSource: "generated", showRemaining: true, showCountdown: true, showStockBar: false, featured: false, teaser: false, alert: true, seoTitle: "", seoDescription: "", seoNoindex: false, settleMode: "off", settleKind: "percent", settleCommission: "", settlePayout: "",
};

describe("deal form", () => {
  it("accepts a complete deal", () => expect(validateDeal(form)).toEqual({}));
  it("checks prices, window and barcode", () => {
    expect(validateDeal({ ...form, price: "abc" }).price).toBe("price");
    expect(validateDeal({ ...form, compareAt: "10" }).compareAt).toBe("compareAt");
    expect(validateDeal({ ...form, salesEnd: "2026-11-01T00:00" }).salesEnd).toBe("window");
    expect(validateDeal({ ...form, codeFormat: "barcode" }).barcodeType).toBe("barcode");
    expect(validateDeal({ ...form, dealType: "value" }).value).toBe("value");
    expect(validateDeal({ ...form, redeemValidity: "until_date" }).redeemUntil).toBe("redeemUntil");
  });
  it("maps to a row and back", () => {
    const row = dealRow(form);
    expect(row.price_cents).toBe(2000);
    expect(row.compare_at_cents).toBe(4000);
    expect(row.sales_start).toBe("2026-12-01T08:00:00.000Z");
    expect(row.redeem_days).toBe(90);
    expect(row.max_per_buyer).toBeNull();
    const back = dealToForm({ ...row, description: null, faq: [], redeem_windows: row.redeem_windows as unknown, barcode_type: null }, [], []);
    expect(back.price).toBe("20");
    expect(back.salesStart).toBe("2026-12-01T09:00");
  });
  it("makes slugs from titles", () => expect(slugifyTitle("2 Pizzas für CHF 20!")).toBe("2-pizzas-fuer-chf-20"));
});

describe("teaser in the form", () => {
  it("needs a sales start", () => {
    expect(validateDeal({ ...form, teaser: true, salesStart: "" }).salesStart).toBe("teaserStart");
    expect(validateDeal({ ...form, teaser: true, salesStart: "2026-12-01T09:00" }).salesStart).toBeUndefined();
    expect(dealRow({ ...form, teaser: true, salesStart: "2026-12-01T09:00" }).teaser).toBe(true);
  });
});

describe("partner settlement fields", () => {
  it("parses commissions and checks the settlement settings", async () => {
    const { commissionBps } = await import("./deal-input");
    expect(commissionBps("15")).toBe(1500);
    expect(commissionBps("12,5 %")).toBe(1250);
    expect(commissionBps("101")).toBeNull();
    expect(commissionBps("abc")).toBeNull();
    const base = { ...form, settleMode: "redemption" as const, settleKind: "percent" as const, settleCommission: "20" };
    expect(validateDeal({ ...base, partnerId: "" }).settleMode).toBe("settlePartner");
    expect(validateDeal({ ...base, partnerId: "p" }).settleMode).toBeUndefined();
    expect(validateDeal({ ...base, partnerId: "p", settleKind: "fixed", settlePayout: "" }).settlePayout).toBe("settlePayout");
    expect(dealRow({ ...base, partnerId: "p", settleKind: "fixed", settlePayout: "8" })).toMatchObject({ settle_mode: "redemption", settle_kind: "fixed", settle_payout_cents: 800, settle_commission_bps: 0 });
  });
});
