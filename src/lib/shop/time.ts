/**
 * Shops work in Europe/Zurich wall time; the database stores UTC. These helpers convert the value
 * of an <input type="datetime-local"> ("2026-12-24T18:00") to ISO and back, DST included.
 */
export const SHOP_TZ = "Europe/Zurich";

function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-12-24T18:00" (Zurich) → "2026-12-24T17:00:00.000Z"; null for empty/invalid input. */
export function zurichLocalToIso(local: string | null | undefined, timeZone = SHOP_TZ): string | null {
  if (!local || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  // Two passes settle the offset around DST switches.
  let ts = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  ts = guess - offsetMinutes(new Date(ts), timeZone) * 60000;
  return new Date(ts).toISOString();
}

/** ISO → "2026-12-24T18:00" in Zurich (for datetime-local inputs). */
export function isoToZurichLocal(iso: string | null | undefined, timeZone = SHOP_TZ): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const local = new Date(at.getTime() + offsetMinutes(at, timeZone) * 60000);
  return local.toISOString().slice(0, 16);
}
