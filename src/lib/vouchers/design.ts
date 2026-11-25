/**
 * Voucher PDF design of a shop: one of three layouts, A4 or A6, colour and what is shown.
 * Pure and isomorphic (editor, preview URL and PDF share it).
 */
export const VOUCHER_LAYOUTS = ["classic", "ticket", "minimal"] as const;
export const VOUCHER_SIZES = ["a4", "a6"] as const;
export type VoucherLayout = (typeof VOUCHER_LAYOUTS)[number];
export type VoucherSize = (typeof VOUCHER_SIZES)[number];

export type VoucherDesign = {
  layout: VoucherLayout;
  size: VoucherSize;
  /** null = the shop's main colour. */
  accent: string | null;
  showImage: boolean;
  showLocations: boolean;
  showTerms: boolean;
  note: string | null;
  /** Half of the page shows an advertising visual (only with an image). */
  adEnabled: boolean;
  adImage: string | null;
};

export const DEFAULT_DESIGN: VoucherDesign = { layout: "classic", size: "a4", accent: null, showImage: true, showLocations: true, showTerms: true, note: null, adEnabled: false, adImage: null };
export const NOTE_MAX = 400;

/** Size of the advertising half in millimetres and the recommended pixels (300 dpi, 1.41:1 on both papers). */
export const AD_FORMAT = { a4: { mm: "210 × 148.5 mm", width: 2480, height: 1754 }, a6: { mm: "105 × 74 mm", width: 1240, height: 877 } } as const;

/** What an uploaded visual would suffer from: too few pixels (below ~150 dpi) or visible cropping. */
export function adIssues(width: number, height: number, size: VoucherSize): { small: boolean; cropped: boolean } {
  const f = AD_FORMAT[size];
  const ratio = width / height / (f.width / f.height);
  return { small: width < f.width / 2 || height < f.height / 2, cropped: ratio < 0.95 || ratio > 1.05 };
}

export const AD_MODES = ["default", "own", "off"] as const;
export type AdMode = (typeof AD_MODES)[number];

/** A deal's advertising: its own visual, none, or (undefined) whatever the shop uses. */
export function dealAd(mode: unknown, image: string | null | undefined): string | null | undefined {
  if (mode === "off") return null;
  return mode === "own" && image ? image : undefined;
}

/** The visual that is really printed, or null for a full-page voucher. */
export const activeAd = (d: VoucherDesign) => (d.adEnabled ? d.adImage : null);

const HEX = /^#[0-9a-f]{6}$/i;

/** Anything (database row, query string, form) → a valid design; unknown values fall back. */
export function parseDesign(input: Partial<Record<keyof VoucherDesign, unknown>> | null | undefined): VoucherDesign {
  const i = input ?? {};
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : fallback);
  const note = typeof i.note === "string" ? i.note.trim().slice(0, NOTE_MAX) : "";
  return {
    layout: VOUCHER_LAYOUTS.find((l) => l === i.layout) ?? DEFAULT_DESIGN.layout,
    size: VOUCHER_SIZES.find((s) => s === i.size) ?? DEFAULT_DESIGN.size,
    accent: typeof i.accent === "string" && HEX.test(i.accent) ? i.accent.toLowerCase() : null,
    showImage: bool(i.showImage, true),
    showLocations: bool(i.showLocations, true),
    showTerms: bool(i.showTerms, true),
    note: note || null,
    adEnabled: bool(i.adEnabled, false),
    adImage: typeof i.adImage === "string" && i.adImage.length <= 500 && /^https?:\/\//.test(i.adImage) ? i.adImage : null,
  };
}

export function designFromRow(row: { layout: string; size: string; accent: string | null; show_image: boolean; show_locations: boolean; show_terms: boolean; note: string | null; ad_enabled: boolean; ad_image: string | null } | null): VoucherDesign {
  if (!row) return DEFAULT_DESIGN;
  return parseDesign({ layout: row.layout, size: row.size, accent: row.accent, showImage: row.show_image, showLocations: row.show_locations, showTerms: row.show_terms, note: row.note, adEnabled: row.ad_enabled, adImage: row.ad_image });
}

export function designToRow(d: VoucherDesign) {
  return { layout: d.layout, size: d.size, accent: d.accent, show_image: d.showImage, show_locations: d.showLocations, show_terms: d.showTerms, note: d.note, ad_enabled: d.adEnabled, ad_image: d.adImage };
}

/** Query string for the live preview. */
export function designQuery(d: VoucherDesign): string {
  const q = new URLSearchParams({ layout: d.layout, size: d.size, showImage: d.showImage ? "1" : "0", showLocations: d.showLocations ? "1" : "0", showTerms: d.showTerms ? "1" : "0" });
  if (d.accent) q.set("accent", d.accent);
  if (d.adEnabled && d.adImage) {
    q.set("adEnabled", "1");
    q.set("adImage", d.adImage);
  }
  if (d.note) q.set("note", d.note);
  return q.toString();
}
