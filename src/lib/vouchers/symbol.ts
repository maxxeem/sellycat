import bwipjs from "bwip-js/generic";

export type CodeFormat = "qr" | "numeric" | "barcode";
export type BarcodeType = "ean13" | "ean8" | "upca" | "code128" | "code39" | "itf14" | "datamatrix" | "pdf417";

/** Link behind the QR code: the voucher's check page on the shop's host. */
export const checkUrl = (host: string, token: string) => `https://${host}/v/${token}`;

const BCID: Record<BarcodeType, string> = { ean13: "ean13", ean8: "ean8", upca: "upca", code128: "code128", code39: "code39", itf14: "itf14", datamatrix: "datamatrix", pdf417: "pdf417" };
const TWO_D = new Set<BarcodeType>(["datamatrix", "pdf417"]);

/**
 * The scannable symbol of a voucher as SVG markup (paths only, no text from the code): a barcode
 * of the code for barcode deals, otherwise a QR code of the check link. Returns null if the code
 * cannot be drawn in that barcode type (e.g. a pool code with letters for EAN).
 */
export function voucherSymbol(v: { codeFormat: CodeFormat; barcodeType: BarcodeType | null; code: string; link: string }): { kind: "qr" | "linear" | "matrix"; svg: string } | null {
  try {
    if (v.codeFormat === "barcode" && v.barcodeType) {
      const text = v.code.replace(/\s/g, "");
      const twoD = TWO_D.has(v.barcodeType);
      const svg = bwipjs.toSVG({ bcid: BCID[v.barcodeType], text, scale: 3, ...(twoD ? {} : { height: 18 }), includetext: false, paddingwidth: 4, paddingheight: 4 });
      return { kind: twoD ? "matrix" : "linear", svg };
    }
    return { kind: "qr", svg: bwipjs.toSVG({ bcid: "qrcode", text: v.link, scale: 4, paddingwidth: 2, paddingheight: 2 }) };
  } catch {
    return null;
  }
}
