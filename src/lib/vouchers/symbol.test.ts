import { describe, expect, it } from "vitest";
import { checkUrl, voucherSymbol } from "./symbol";

describe("voucherSymbol", () => {
  const link = checkUrl("shop.sellycat.com", "tok_123456789012345678");
  it("draws a QR code of the check link for QR and numeric vouchers", () => {
    expect(link).toBe("https://shop.sellycat.com/v/tok_123456789012345678");
    for (const codeFormat of ["qr", "numeric"] as const) {
      const s = voucherSymbol({ codeFormat, barcodeType: null, code: "ABCD-EFGH-JKMN", link });
      expect(s?.kind).toBe("qr");
      expect(s?.svg).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
    }
  });
  it("draws barcodes of the code itself", () => {
    expect(voucherSymbol({ codeFormat: "barcode", barcodeType: "ean13", code: "2000000000008", link })?.kind).toBe("linear");
    expect(voucherSymbol({ codeFormat: "barcode", barcodeType: "code128", code: "ABCD-EFGH-JKMN", link })?.kind).toBe("linear");
    expect(voucherSymbol({ codeFormat: "barcode", barcodeType: "datamatrix", code: "ABCD-EFGH-JKMN", link })?.kind).toBe("matrix");
  });
  it("never puts code text into the markup", () => {
    const s = voucherSymbol({ codeFormat: "barcode", barcodeType: "code128", code: "<b>X</b>", link });
    expect(s?.svg ?? "").not.toContain("<b>");
  });
  it("returns null when the code does not fit the barcode type", () => {
    expect(voucherSymbol({ codeFormat: "barcode", barcodeType: "ean13", code: "ABC", link })).toBeNull();
  });
});
