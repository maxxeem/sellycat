import { describe, expect, it } from "vitest";
import type { DealView } from "@/components/shop/types";
import { getDictionary } from "@/lib/i18n";
import { DESCRIPTION_MAX, TITLE_MAX, autoDescription, autoTitle, categorySeo, clip, dealIndexable, dealSchema, dealSeo, homeSeo, jsonLd, listSchema, llmsText, shopBase } from "./seo";

const t = getDictionary("de").shop.seo;
const shop = { name: "my105", currency: "CHF", locale: "de" as const };
const schema = { ...shop, base: "https://deals.example.ch" };
const now = new Date("2026-12-01T12:00:00Z");
const loc = { id: "l", name: "Kino Eins", street: "Weg 1", zip: "8000", city: "Zürich", lat: 47.3, lng: 8.5, opening_hours: null };
const deal = (o: Partial<DealView> = {}): DealView => ({
  id: "d", slug: "kino", title: "2 Kinotickets", subtitle: "Für alle Filme", description: null, terms: null, faq: [], deal_type: "fixed", price_cents: 2000, compare_at_cents: 4000, value_cents: null,
  state: "published", sales_start: null, sales_end: null, total_qty: 10, sold_qty: 3, reserved_qty: 0, max_per_order: null, redeem_validity: "none", redeem_until: null, redeem_days: null, redeem_windows: [],
  show_remaining: false, show_countdown: false, show_stock_bar: false, featured: false, images: [{ url: "https://x/a.jpg", alt: null }], partner: { name: "Kino Eins", logo_url: null, website_url: null }, category: { name: "Kultur", slug: "kultur" }, locations: [loc], ...o,
});
const product = (d: DealView) => (dealSchema(d, schema, dealSeo(d, shop, t, now), now)["@graph"] as Array<Record<string, unknown>>).find((n) => n["@type"] === "Product")!;

describe("shop seo", () => {
  it("clips at words", () => {
    expect(clip("Ein  kurzer Text", 50)).toBe("Ein kurzer Text");
    const c = clip("Ein langer Satz, der hier nicht mehr ganz hineinpasst", 30);
    expect(c.length).toBeLessThanOrEqual(30);
    expect(c).toMatch(/…$/);
  });
  it("generates title and description within the limits", () => {
    expect(autoTitle(deal(), shop, t)).toBe("2 Kinotickets in Zürich – Kino Eins · my105");
    expect(autoDescription(deal({ sales_end: "2026-12-24T22:00:00Z" }), shop, t, now).replace(/\u00a0/g, " ")).toBe("Für alle Filme. Für CHF 20 statt CHF 40 (50% sparen). Bis 24. Dezember.");
    const long = deal({ title: "Wort ".repeat(27).trim(), subtitle: "Langer Text ".repeat(40) });
    expect(autoTitle(long, shop, t)).toBe(long.title);
    expect(autoDescription(long, shop, t, now).length).toBeLessThanOrEqual(DESCRIPTION_MAX + 1);
    expect(autoTitle(deal(), shop, t).length).toBeLessThanOrEqual(TITLE_MAX);
  });
  it("prefers the shop's own texts", () => {
    expect(dealSeo(deal({ seo_title: " Eigen ", seo_description: "Text" }), shop, t, now)).toEqual({ title: "Eigen", description: "Text" });
  });
  it("never reveals a teaser's price", () => {
    const d = deal({ teaser: true, sales_start: "2026-12-10T10:00:00Z", price_cents: 12345 });
    const all = JSON.stringify([dealSeo(d, shop, t, now), dealSchema(d, schema, dealSeo(d, shop, t, now), now)]) + llmsText({ ...schema, description: "x" }, [d], [], [], t, now);
    expect(all).not.toMatch(/123/);
    expect(product(d).offers).toBeUndefined();
  });
  it("describes the offer, hiding the stock unless the page shows it", () => {
    const offer = product(deal()).offers as Record<string, unknown>;
    expect(offer).toMatchObject({ price: "20.00", priceCurrency: "CHF", availability: "https://schema.org/InStock", priceSpecification: { price: "40.00" } });
    expect(offer.inventoryLevel).toBeUndefined();
    expect((product(deal({ show_remaining: true })).offers as Record<string, unknown>).inventoryLevel).toMatchObject({ value: 7 });
  });
  it("indexes only listed deals that are not excluded", () => {
    expect(dealIndexable(deal(), now)).toBe(true);
    expect(dealIndexable(deal({ seo_noindex: true }), now)).toBe(false);
    expect(dealIndexable(deal({ state: "ended" }), now)).toBe(false);
  });
  it("covers start page, category and llms.txt", () => {
    expect(homeSeo({ ...shop, settings: {} }, [deal()], t)).toEqual({ title: "my105 – Deals und Gutscheine", description: "Aktuelle Deals und Gutscheine bei my105: 2 Kinotickets." });
    expect(homeSeo({ ...shop, settings: { seo_title: "A", seo_description: "B" } }, [], t)).toEqual({ title: "A", description: "B" });
    expect(categorySeo("Kultur", shop, [deal()], t).title).toContain("Kultur");
    expect(JSON.stringify(listSchema(schema, [deal()], { name: "Kultur", slug: "kultur" }))).toContain("https://deals.example.ch/k/kultur");
    expect(llmsText({ ...schema, description: "Shop" }, [deal()], [], [], t, now)).toContain("[2 Kinotickets](https://deals.example.ch/d/kino)");
  });
  it("cannot break out of the script tag; local shops use http", () => {
    expect(jsonLd({ a: "</script>" })).not.toContain("<");
    expect(shopBase("a.localhost", "localhost:3000")).toBe("http://a.localhost:3000");
    expect(shopBase("deals.example.ch")).toBe("https://deals.example.ch");
  });
});
