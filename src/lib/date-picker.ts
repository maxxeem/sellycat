/**
 * Helpers for the date/time picker (pure, tested). Values are local Zurich wall-clock strings,
 * the same as <input type="datetime-local|date|time">: "2026-11-23T14:30", "2026-11-23", "14:30".
 */
export type PickerMode = "datetime" | "date" | "time";

const pad = (n: number) => String(n).padStart(2, "0");

/** Current wall-clock time in Zurich (independent of the browser's time zone). */
export function zurichNow(now: Date = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function splitValue(value: string, mode: PickerMode): { date: string | null; time: string | null } {
  if (mode === "time") return { date: null, time: /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null };
  const date = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  const time = mode === "datetime" && /T\d{2}:\d{2}/.test(value) ? value.slice(11, 16) : null;
  return { date, time };
}

export function joinValue(date: string | null, time: string | null, mode: PickerMode): string {
  if (mode === "time") return time ?? "";
  if (mode === "date") return date ?? "";
  return date ? `${date}T${time ?? "00:00"}` : "";
}

/** Weeks of a month, Monday first; `null` fills the days outside the month. */
export function monthGrid(year: number, month: number): Array<Array<string | null>> {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: Array<string | null> = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** "23. November 2026, 14:30" / "23 November 2026, 14:30" for the field. */
export function formatValue(value: string, mode: PickerMode, locale: "de" | "en"): string {
  const { date, time } = splitValue(value, mode);
  if (mode === "time") return time ?? "";
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const text = new Intl.DateTimeFormat(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return mode === "datetime" && time ? `${text}, ${time}` : text;
}

export function clampTime(h: number, m: number): string {
  return `${pad(Math.min(23, Math.max(0, h)))}:${pad(Math.min(59, Math.max(0, m)))}`;
}
