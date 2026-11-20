/** Default end of a settlement run: the last day of the previous month (pure, tested). */
export function lastMonthEnd(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 0));
  return d.toISOString().slice(0, 10);
}

export const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** "1.–31. Oktober 2026" style period text. */
export function periodText(from: string | null, to: string, locale: "de" | "en"): string {
  const f = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return from && from !== to ? `${f(from)} – ${f(to)}` : f(to);
}
