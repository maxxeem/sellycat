import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { VOUCHER_LAYOUTS, VOUCHER_SIZES, activeAd, adIssues, parseDesign } from "./design";
import { renderVoucherPdf, type PdfVoucher } from "./pdf";

const voucher: PdfVoucher = {
  title: "2 Pizzas nach Wahl inkl. Getränk",
  subtitle: "Im Herzen der Altstadt",
  partner: "Pizzeria Bella",
  code: "K7MQ-4XPA-92HD",
  codeFormat: "qr",
  barcodeType: null,
  link: "https://city-deals.sellycat.com/v/Ab3dEf6hIj9kLm2nOp5qRs8t",
  status: "valid",
  valueCents: 5000,
  remainingCents: 3000,
  currency: "CHF",
  validUntil: "2027-03-31T22:00:00Z",
  terms: "Nur mit Reservation. Nicht kumulierbar. ".repeat(12),
  image: null,
  locations: [{ name: "Pizzeria Bella", street: "Marktgasse 12", zip: "3011", city: "Bern" }],
};

describe("renderVoucherPdf", () => {
  for (const layout of VOUCHER_LAYOUTS)
    for (const size of VOUCHER_SIZES)
      it(`renders ${layout} on ${size.toUpperCase()}, one page per voucher`, async () => {
        const pdf = await renderVoucherPdf({
          shopName: "City Deals",
          locale: "de",
          primary: "#0a7cff",
          logoUrl: null,
          host: "city-deals.sellycat.com",
          orderNumber: "AB12-CD34",
          gift: { from: "Anna", message: "Alles Gute!" },
          vouchers: [voucher, { ...voucher, codeFormat: "barcode", barcodeType: "ean13", code: "2001234567893", status: "redeemed" }, { ...voucher, codeFormat: "numeric", code: "4821 0937 5512" }],
          design: parseDesign({ layout, size, note: "Bitte bei der Reservation den Code angeben." }),
        });
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        const text = pdf.toString("latin1");
        expect(text.match(/\/Type \/Page\b/g)?.length).toBe(3);
        expect(text).toContain(size === "a6" ? "297.6" : "595.2");
        // Local look at the result: PDF_OUT=/some/dir npx vitest run src/lib/vouchers/pdf.test.ts
        if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/${layout}-${size}.pdf`, pdf);
      }, 30_000);
});

describe("advertising half", () => {
  const IMG = "https://test.supabase.co/storage/v1/object/public/shop-media/t/ad.jpg";
  beforeAll(async () => {
    const { default: sharp } = await import("sharp");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2480" height="1754"><defs><linearGradient id="g"><stop stop-color="#ff4b23"/><stop offset="1" stop-color="#7a1fa2"/></linearGradient></defs><rect width="2480" height="1754" fill="url(#g)"/><rect x="60" y="60" width="2360" height="1634" fill="none" stroke="#fff" stroke-width="20"/><circle cx="1240" cy="877" r="300" fill="#fff"/></svg>`;
    const jpg = await sharp(Buffer.from(svg)).jpeg().toBuffer();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array(jpg)));
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const render = (design: Record<string, unknown>, v = voucher) =>
    renderVoucherPdf({ shopName: "City Deals", locale: "de", primary: "#0a7cff", logoUrl: null, host: "city-deals.sellycat.com", orderNumber: "AB12-CD34", gift: { from: "Anna", message: "Alles Gute!" }, vouchers: [{ ...v, image: IMG }], design: parseDesign(design) });
  const pages = (pdf: Buffer) => pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length;

  for (const layout of VOUCHER_LAYOUTS)
    for (const size of VOUCHER_SIZES)
      it(`keeps a ${layout} voucher on one ${size.toUpperCase()} page`, async () => {
        const pdf = await render({ layout, size, adEnabled: true, adImage: IMG, note: "Bitte bei der Reservation den Code angeben." });
        if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/ad-${layout}-${size}.pdf`, pdf);
        expect(pages(pdf)).toBe(1);
      }, 30_000);

  it("continues long conditions on a second page instead of cutting them", async () => {
    const pdf = await render({ layout: "classic", adEnabled: true, adImage: IMG }, { ...voucher, terms: "Nur mit Reservation. Nicht kumulierbar. ".repeat(62) });
    if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/ad-long.pdf`, pdf);
    expect(pages(pdf)).toBe(2);
  }, 30_000);

  it("needs switch and image; describes the format", () => {
    expect(activeAd(parseDesign({ adEnabled: true }))).toBeNull();
    expect(activeAd(parseDesign({ adImage: IMG }))).toBeNull();
    expect(activeAd(parseDesign({ adEnabled: "1", adImage: IMG }))).toBe(IMG);
    expect(parseDesign({ adImage: "javascript:alert(1)" }).adImage).toBeNull();
    expect(adIssues(2480, 1754, "a4")).toEqual({ small: false, cropped: false });
    expect(adIssues(1000, 1000, "a4")).toEqual({ small: true, cropped: true });
    expect(adIssues(1240, 877, "a6")).toEqual({ small: false, cropped: false });
  });
});

describe("symbolVector", () => {
  it("turns QR codes and barcodes into exact module rectangles with a quiet zone", async () => {
    const { symbolVector } = await import("./symbol");
    const qr = symbolVector({ codeFormat: "qr", barcodeType: null, code: "X", link: voucher.link })!;
    expect(qr.width).toBe(qr.height);
    expect(qr.rects.every(([x, y, w, h]) => Number.isInteger(x) && Number.isInteger(y) && w >= 1 && h === 1)).toBe(true);
    // Finder pattern: the top row starts with seven dark modules after the quiet zone.
    expect(qr.rects[0]).toEqual([2, 2, 7, 1]);
    const ean = symbolVector({ codeFormat: "barcode", barcodeType: "ean13", code: "2001234567893", link: "" })!;
    expect(ean.rects[0][0]).toBe(10);
    expect(ean.width).toBe(95 + 20);
    expect(symbolVector({ codeFormat: "barcode", barcodeType: "ean13", code: "ABC", link: "" })).toBeNull();
    // Plain number/letter codes are typed in: no QR code anywhere.
    expect(symbolVector({ codeFormat: "numeric", barcodeType: null, code: "4821 0937 5512", link: voucher.link })).toBeNull();
  });
});
