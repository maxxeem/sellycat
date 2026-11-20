/**
 * CSV for Excel in Switzerland: semicolons, CRLF, UTF-8 with BOM. Cells that start like a
 * formula (= + - @) get a leading apostrophe, so a buyer's name can never run as a formula.
 */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
}

/** Amount in francs for CSV (no currency sign, dot as decimal mark). */
export const csvMoney = (cents: number | null | undefined) => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2));

/** Date and time in Zurich, sortable (2026-11-19 14:05). */
export const csvDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
