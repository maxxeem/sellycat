import { describe, expect, it } from "vitest";
import { appleBarcode, applePassJson, googleBarcode, googleClassId, googleObject, googleObjectId, parseWalletDesign, walletColors, type WalletShop, type WalletVoucher } from "./content";

const shop: WalletShop = { id: "11111111-2222-3333-4444-555555555555", name: "City Deals", locale: "de", host: "city-deals.sellycat.com", primary: "#ff4b23", logo: null };
const v: WalletVoucher = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "2 Pizzas",
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
  terms: "Nur mit Reservation.",
  image: "https://x.supabase.co/storage/v1/object/public/shop-media/a.webp",
  locations: [{ name: "Bella", street: "Marktgasse 12", zip: "3011", city: "Bern", lat: 46.948, lng: 7.447 }, { name: "Ohne Koordinaten", street: null, zip: null, city: "Zürich" }],
};
const ids = { passTypeIdentifier: "pass.com.sellycat.voucher", teamIdentifier: "32J9N54M74", authenticationToken: "x".repeat(40), webServiceURL: "https://sellycat.com/api/passkit" };

describe("wallet design", () => {
  it("falls back to the shop colour with readable text", () => {
    expect(walletColors(parseWalletDesign(null), "#111111")).toMatchObject({ background: "#111111", foreground: "#ffffff" });
    expect(walletColors(parseWalletDesign({ background: "#FFEE00" }), "#111111")).toMatchObject({ background: "#ffee00", foreground: "#111111" });
    expect(parseWalletDesign({ background: "red", showImage: "yes" })).toMatchObject({ background: null, showImage: true });
  });
});

describe("Apple pass", () => {
  it("shows Apple-readable barcodes and a QR of the check link otherwise", () => {
    expect(appleBarcode(v)).toMatchObject({ format: "PKBarcodeFormatQR", message: v.link, altText: v.code });
    expect(appleBarcode({ ...v, codeFormat: "barcode", barcodeType: "code128", code: "ABC 123" })).toMatchObject({ format: "PKBarcodeFormatCode128", message: "ABC123" });
    // A barcode stays a barcode (same characters), never a QR code; plain codes have no symbol.
    for (const type of ["ean13", "ean8", "upca", "code39", "itf14"] as const)
      expect(appleBarcode({ ...v, codeFormat: "barcode", barcodeType: type, code: "2001234567893" })).toMatchObject({ format: "PKBarcodeFormatCode128", message: "2001234567893" });
    expect(appleBarcode({ ...v, codeFormat: "barcode", barcodeType: "datamatrix", code: "AB12" })).toMatchObject({ format: "PKBarcodeFormatAztec", message: "AB12" });
    expect(appleBarcode({ ...v, codeFormat: "barcode", barcodeType: "pdf417", code: "AB12" })).toMatchObject({ format: "PKBarcodeFormatPDF417" });
    expect(appleBarcode({ ...v, codeFormat: "numeric", code: "4821 0937 5512" })).toBeNull();
    expect(googleBarcode({ ...v, codeFormat: "barcode", barcodeType: "ean13", code: "2001234567893" })).toMatchObject({ type: "EAN_13", value: "2001234567893" });
    expect(googleBarcode({ ...v, codeFormat: "numeric", code: "4821 0937 5512" })).toBeNull();
    const plain = applePassJson({ ...v, codeFormat: "numeric", code: "4821 0937 5512" }, shop, parseWalletDesign({}), { passTypeIdentifier: "pass.x", teamIdentifier: "T" });
    expect(plain).not.toHaveProperty("barcodes");
    expect(plain.coupon.auxiliaryFields[0]).toMatchObject({ value: "4821 0937 5512" });
  });

  it("builds a coupon with remaining value, validity, locations with coordinates and the update service", () => {
    const p = applePassJson(v, shop, parseWalletDesign(null), ids);
    expect(p).toMatchObject({ serialNumber: v.id, organizationName: "City Deals", logoText: "City Deals", webServiceURL: ids.webServiceURL, expirationDate: "2027-03-31T22:00:00.000Z" });
    expect(p.coupon.headerFields[0]).toMatchObject({ label: "Restwert", value: expect.stringContaining("30") });
    expect(p.coupon.primaryFields[0].value).toBe("2 Pizzas");
    expect(p.locations).toHaveLength(1);
    expect("voided" in p).toBe(false);
    expect(p.backgroundColor).toBe("rgb(255, 75, 35)");
  });

  it("marks used vouchers as voided and drops locations when switched off", () => {
    const p = applePassJson({ ...v, status: "redeemed" }, shop, parseWalletDesign({ showLocations: false }), ids);
    expect(p.voided).toBe(true);
    expect(p.coupon.headerFields[0]).toMatchObject({ value: "Eingelöst" });
    expect("locations" in p).toBe(false);
  });
});

describe("Google pass", () => {
  it("uses safe ids, the shop class, the state and the barcode type", () => {
    const issuer = "3388000000023229714";
    const o = googleObject({ ...v, codeFormat: "barcode", barcodeType: "ean13", code: "2001234567893", status: "redeemed" }, shop, parseWalletDesign(null), issuer);
    expect(o.id).toBe(googleObjectId(issuer, v.id));
    expect(o.id).toMatch(/^[\w.-]+$/);
    expect(o.classId).toBe(googleClassId(issuer, shop.id));
    expect(o.state).toBe("COMPLETED");
    expect(o.barcode).toEqual({ type: "EAN_13", value: "2001234567893", alternateText: "2001234567893" });
    expect(o.heroImage).toEqual({ sourceUri: { uri: v.image } });
    expect("logo" in o).toBe(false);
  });
});
