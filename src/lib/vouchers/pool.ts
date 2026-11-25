/**
 * Code pools: parsing an uploaded list (CSV, TXT or pasted) and the warning level. Pure and
 * isomorphic (the editor previews what the server will import).
 */
export const POOL_MAX_IMPORT = 20000;
export const POOL_MAX_CODE = 120;

export type ParsedPool = { codes: string[]; duplicates: number; tooLong: number; header: boolean };

const HEADER = /^(codes?|gutschein(code)?s?|voucher(\s?codes?)?|coupon(\s?codes?)?|nummer|number)$/i;

/** One code per line; in a CSV the first column counts. A header line ("code") is skipped. */
export function parsePoolCodes(text: string): ParsedPool {
  const seen = new Set<string>();
  let duplicates = 0;
  let tooLong = 0;
  let header = false;
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  lines.forEach((line, n) => {
    const cell = (line.split(/[,;\t]/)[0] ?? "").trim().replace(/^"(.*)"$/, "$1").replace(/""/g, '"').trim();
    if (!cell) return;
    if (n === 0 && HEADER.test(cell)) {
      header = true;
      return;
    }
    if (cell.length > POOL_MAX_CODE) {
      tooLong += 1;
      return;
    }
    if (seen.has(cell)) duplicates += 1;
    else seen.add(cell);
  });
  return { codes: [...seen], duplicates, tooLong, header };
}

/** How many units a pool deal can sell in total (sold, plus free codes, plus codes about to be imported). */
export const poolSellable = (sold: number, free: number, pending = 0) => sold + free + pending;

/** The sellable total when the entered quantity is higher than that, else null. */
export function poolShortage(totalQty: number | null, sold: number, free: number, pending = 0): number | null {
  const can = poolSellable(sold, free, pending);
  return totalQty !== null && totalQty > can ? can : null;
}

export type PoolLevel = "empty" | "low" | "ok";

/** Low: fewer than 10 codes, or under 10 % of all codes, are still free. */
export function poolLevel(free: number, used: number): PoolLevel {
  if (free <= 0) return "empty";
  const total = free + used;
  return free < Math.max(10, Math.ceil(total * 0.1)) ? "low" : "ok";
}
