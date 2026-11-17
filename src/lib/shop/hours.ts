/**
 * Opening hours of a redemption place, always structured (never free text): per weekday
 * (1 = Monday … 7 = Sunday) a list of time ranges, an empty list means closed. A range may run
 * past midnight (to < from). Pure and tested.
 */
export type TimeRange = { from: string; to: string };
export type OpeningHours = Record<"1" | "2" | "3" | "4" | "5" | "6" | "7", TimeRange[]>;
export const DAYS = ["1", "2", "3", "4", "5", "6", "7"] as const;
export type Day = (typeof DAYS)[number];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const emptyHours = (): OpeningHours => ({ "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [] });

/** Anything (form JSON, database) → valid hours, or null when nothing usable is in it. */
export function parseHours(input: unknown): OpeningHours | null {
  if (!input || typeof input !== "object") return null;
  const out = emptyHours();
  let any = false;
  for (const d of DAYS) {
    const list = (input as Record<string, unknown>)[d];
    if (!Array.isArray(list)) continue;
    any = true;
    out[d] = list
      .filter((r): r is TimeRange => Boolean(r) && typeof r === "object" && TIME.test((r as TimeRange).from) && TIME.test((r as TimeRange).to) && (r as TimeRange).from !== (r as TimeRange).to)
      .slice(0, 4)
      .sort((a, b) => a.from.localeCompare(b.from));
  }
  return any ? out : null;
}

type GooglePoint = { day?: number; hour?: number; minute?: number };
type GooglePeriod = { open?: GooglePoint; close?: GooglePoint };

/** Google Places "regularOpeningHours.periods" (day 0 = Sunday) → our hours. */
export function fromGooglePeriods(periods: GooglePeriod[] | undefined | null): OpeningHours | null {
  if (!periods?.length) return null;
  const out = emptyHours();
  const time = (p: GooglePoint) => `${String(p.hour ?? 0).padStart(2, "0")}:${String(p.minute ?? 0).padStart(2, "0")}`;
  // Open around the clock: one period without a close.
  if (periods.length === 1 && periods[0].open && !periods[0].close) {
    for (const d of DAYS) out[d] = [{ from: "00:00", to: "23:59" }];
    return out;
  }
  for (const p of periods) {
    if (!p.open || typeof p.open.day !== "number") continue;
    const day = String(p.open.day === 0 ? 7 : p.open.day) as Day;
    const close = p.close ? time(p.close) : "23:59";
    out[day].push({ from: time(p.open), to: close === "00:00" ? "23:59" : close });
  }
  for (const d of DAYS) out[d].sort((a, b) => a.from.localeCompare(b.from));
  return out;
}

const DAY_NAMES = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
} as const;

const rangeText = (list: TimeRange[], closed: string) => (list.length ? list.map((r) => `${r.from}–${r.to === "23:59" ? "24:00" : r.to}`).join(", ") : closed);

/**
 * Lines for display, identical days grouped: ["Mo–Fr 09:00–18:00", "Sa 10:00–16:00", "So geschlossen"].
 */
export function formatHours(h: OpeningHours, locale: "de" | "en"): string[] {
  const closed = locale === "de" ? "geschlossen" : "closed";
  const names = DAY_NAMES[locale];
  const lines: string[] = [];
  let i = 0;
  while (i < 7) {
    const text = rangeText(h[DAYS[i]], closed);
    let j = i;
    while (j + 1 < 7 && rangeText(h[DAYS[j + 1]], closed) === text) j += 1;
    const label = j === i ? names[i] : j === i + 1 ? `${names[i]}, ${names[j]}` : `${names[i]}–${names[j]}`;
    lines.push(`${label} ${text}`);
    i = j + 1;
  }
  return lines;
}

/** Copy one day's ranges to other days (e.g. Monday to Monday–Friday). */
export function copyDay(h: OpeningHours, from: Day, to: readonly Day[]): OpeningHours {
  const next = { ...h };
  for (const d of to) next[d] = h[from].map((r) => ({ ...r }));
  return next;
}
