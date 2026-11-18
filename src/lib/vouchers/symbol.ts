import bwipjs from "bwip-js/generic";

export type CodeFormat = "qr" | "numeric" | "barcode";
export type BarcodeType = "ean13" | "ean8" | "upca" | "code128" | "code39" | "itf14" | "datamatrix" | "pdf417";

/** Link behind the QR code: the voucher's check page on the shop's host. */
export const checkUrl = (host: string, token: string) => `https://${host}/v/${token}`;

const BCID: Record<BarcodeType, string> = { ean13: "ean13", ean8: "ean8", upca: "upca", code128: "code128", code39: "code39", itf14: "itf14", datamatrix: "datamatrix", pdf417: "pdf417" };
const TWO_D = new Set<BarcodeType>(["datamatrix", "pdf417"]);

/**
 * The scannable symbol of a voucher as SVG markup (paths only, no text from the code): a barcode
 * of the code for barcode deals, a QR code of the check link for QR deals and nothing for plain
 * number/letter codes (they are typed in). Returns null if the code cannot be drawn in that
 * barcode type (e.g. a pool code with letters for EAN).
 */
export function voucherSymbol(v: { codeFormat: CodeFormat; barcodeType: BarcodeType | null; code: string; link: string }): { kind: "qr" | "linear" | "matrix"; svg: string } | null {
  if (v.codeFormat === "numeric") return null;
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

export type SymbolVector = { width: number; height: number; rects: Array<[x: number, y: number, w: number, h: number]> };

type Raw2D = { pixs: number[]; pixx: number; pixy: number };
type RawLinear = { sbs: number[] };

/**
 * The symbol as exact rectangles in module units, straight from the barcode matrix, for the PDF:
 * drawn as vectors the modules stay sharp and square at any print size (a raster image gets
 * resampled by printers, and path parsing can bend edges). Includes the quiet zone.
 */
export function symbolVector(v: { codeFormat: CodeFormat; barcodeType: BarcodeType | null; code: string; link: string }): SymbolVector | null {
  if (v.codeFormat === "numeric") return null;
  try {
    const linear = v.codeFormat === "barcode" && v.barcodeType && !TWO_D.has(v.barcodeType);
    const bcid = v.codeFormat === "barcode" && v.barcodeType ? BCID[v.barcodeType] : "qrcode";
    const text = v.codeFormat === "barcode" ? v.code.replace(/\s/g, "") : v.link;
    const raw = (bwipjs as unknown as { raw: (bcid: string, text: string, opts: string) => Array<Raw2D & RawLinear> }).raw(bcid, text, "")[0];
    const rects: SymbolVector["rects"] = [];
    if (linear) {
      const quiet = 10;
      const total = raw.sbs.reduce((a, b) => a + b, 0);
      const height = Math.round(total * 0.4);
      let x = quiet;
      raw.sbs.forEach((w, i) => {
        if (i % 2 === 0 && w > 0) rects.push([x, 0, w, height]);
        x += w;
      });
      return { width: total + quiet * 2, height, rects };
    }
    // 2D: one rectangle per run of dark modules in a row; PDF417 rows are three modules high.
    const quiet = 2;
    const rowH = bcid === "pdf417" ? 3 : 1;
    for (let y = 0; y < raw.pixy; y++) {
      let start = -1;
      for (let x = 0; x <= raw.pixx; x++) {
        const dark = x < raw.pixx && raw.pixs[y * raw.pixx + x] === 1;
        if (dark && start < 0) start = x;
        if (!dark && start >= 0) {
          rects.push([start + quiet, y * rowH + quiet, x - start, rowH]);
          start = -1;
        }
      }
    }
    return rects.length ? { width: raw.pixx + quiet * 2, height: raw.pixy * rowH + quiet * 2, rects } : null;
  } catch {
    return null;
  }
}
