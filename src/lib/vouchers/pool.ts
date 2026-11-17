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

export type PoolLevel = "empty" | "low" | "ok";

/** Low: fewer than 10 codes, or under 10 % of all codes, are still free. */
export function poolLevel(free: number, used: number): PoolLevel {
  if (free <= 0) return "empty";
  const total = free + used;
  return free < Math.max(10, Math.ceil(total * 0.1)) ? "low" : "ok";
}
