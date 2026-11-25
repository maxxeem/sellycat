/** Automatic sending of the deal alert (pure, isomorphic): settings, validation, next sending time. Times are Europe/Zurich. */
import { zurichLocalToIso } from "@/lib/shop/time";

export const ALERT_MODES = ["instant", "scheduled", "manual"] as const;
export type AlertMode = (typeof ALERT_MODES)[number];
export type AlertSchedule = {
  mode: AlertMode;
  /** instant: only between these times; null = around the clock. */
  window: { from: string; to: string } | null;
  /** scheduled: ISO weekdays (1 = Monday) and time of the collected mail. */
  weekdays: number[];
  sendAt: string;
};

export const DEFAULT_SCHEDULE: AlertSchedule = { mode: "instant", window: null, weekdays: [1, 2, 3, 4, 5], sendAt: "09:00" };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Anything → valid settings, or the field that is wrong. */
export function parseSchedule(input: unknown): { ok: true; value: AlertSchedule } | { ok: false; error: "mode" | "window" | "weekdays" | "time" } {
  const i = (input ?? {}) as Partial<Record<keyof AlertSchedule, unknown>>;
  const mode = ALERT_MODES.find((m) => m === i.mode);
  if (!mode) return { ok: false, error: "mode" };
  let window: AlertSchedule["window"] = null;
  if (i.window) {
    const w = i.window as { from?: unknown; to?: unknown };
    if (typeof w.from !== "string" || typeof w.to !== "string" || !TIME.test(w.from) || !TIME.test(w.to) || w.from >= w.to) return { ok: false, error: "window" };
    window = { from: w.from, to: w.to };
  }
  const weekdays = Array.isArray(i.weekdays) ? [...new Set(i.weekdays.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b) : [];
  if (!weekdays.length) return { ok: false, error: "weekdays" };
  if (typeof i.sendAt !== "string" || !TIME.test(i.sendAt)) return { ok: false, error: "time" };
  return { ok: true, value: { mode, window, weekdays, sendAt: i.sendAt } };
}

type Row = { mode: string; window_from: string; window_to: string; weekdays: number[]; send_at: string };
const hm = (t: string) => t.slice(0, 5);

export function scheduleFromRow(row: Row | null): AlertSchedule {
  if (!row) return DEFAULT_SCHEDULE;
  const all = hm(row.window_from) === "00:00" && hm(row.window_to) === "24:00";
  const r = parseSchedule({ mode: row.mode, window: all ? null : { from: hm(row.window_from), to: hm(row.window_to) }, weekdays: row.weekdays, sendAt: hm(row.send_at) });
  return r.ok ? r.value : DEFAULT_SCHEDULE;
}

export const scheduleToRow = (s: AlertSchedule) => ({ mode: s.mode, window_from: s.window?.from ?? "00:00", window_to: s.window?.to ?? "24:00", weekdays: s.weekdays, send_at: s.sendAt });

/** The next collected mail after `now`, null in the other modes. */
export function nextSlot(s: AlertSchedule, now: Date): Date | null {
  if (s.mode !== "scheduled") return null;
  for (let g = 0; g <= 8; g++) {
    const day = new Date(now.getTime() + g * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
    const iso = new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
    const at = zurichLocalToIso(`${day}T${s.sendAt}`);
    if (at && s.weekdays.includes(iso) && new Date(at) > now) return new Date(at);
  }
  return null;
}
