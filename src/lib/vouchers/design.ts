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
};

export const DEFAULT_DESIGN: VoucherDesign = { layout: "classic", size: "a4", accent: null, showImage: true, showLocations: true, showTerms: true, note: null };
export const NOTE_MAX = 400;

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
  };
}

export function designFromRow(row: { layout: string; size: string; accent: string | null; show_image: boolean; show_locations: boolean; show_terms: boolean; note: string | null } | null): VoucherDesign {
  if (!row) return DEFAULT_DESIGN;
  return parseDesign({ layout: row.layout, size: row.size, accent: row.accent, showImage: row.show_image, showLocations: row.show_locations, showTerms: row.show_terms, note: row.note });
}

export function designToRow(d: VoucherDesign) {
  return { layout: d.layout, size: d.size, accent: d.accent, show_image: d.showImage, show_locations: d.showLocations, show_terms: d.showTerms, note: d.note };
}

/** Query string for the live preview. */
export function designQuery(d: VoucherDesign): string {
  const q = new URLSearchParams({ layout: d.layout, size: d.size, showImage: d.showImage ? "1" : "0", showLocations: d.showLocations ? "1" : "0", showTerms: d.showTerms ? "1" : "0" });
  if (d.accent) q.set("accent", d.accent);
  if (d.note) q.set("note", d.note);
  return q.toString();
}
