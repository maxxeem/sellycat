import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VOUCHER_LAYOUTS, VOUCHER_SIZES, parseDesign } from "./design";
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
          vouchers: [voucher, { ...voucher, codeFormat: "barcode", barcodeType: "ean13", code: "2001234567893", status: "redeemed" }],
          design: parseDesign({ layout, size, note: "Bitte bei der Reservation den Code angeben." }),
        });
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        const text = pdf.toString("latin1");
        expect(text.match(/\/Type \/Page\b/g)?.length).toBe(2);
        expect(text).toContain(size === "a6" ? "297.6" : "595.2");
        // Local look at the result: PDF_OUT=/some/dir npx vitest run src/lib/vouchers/pdf.test.ts
        if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/${layout}-${size}.pdf`, pdf);
      }, 30_000);
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
  });
});
