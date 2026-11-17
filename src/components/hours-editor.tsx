"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { DateTimePicker } from "@/components/date-time-picker";
import { useI18n } from "@/lib/i18n/context";
import { DAYS, copyDay, emptyHours, type Day, type OpeningHours } from "@/lib/shop/hours";

/**
 * Opening hours as a weekday grid (never free text): per day open/closed and up to three time
 * ranges, plus "copy Monday" shortcuts. `null` = no hours entered.
 */
export function HoursEditor({ value, onChange }: { value: OpeningHours | null; onChange: (v: OpeningHours | null) => void }) {
  const { t } = useI18n();
  const p = t.partners;
  if (!value)
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-dashed border-line px-3 py-2.5 text-sm">
        <span className="text-muted">{p.hoursNone}</span>
        <button type="button" onClick={() => onChange({ ...emptyHours(), "1": [{ from: "09:00", to: "18:00" }] })} className="font-semibold text-accent-text hover:underline">
          {p.hoursSet}
        </button>
      </div>
    );

  const setDay = (d: Day, list: OpeningHours[Day]) => onChange({ ...value, [d]: list });
  return (
    <div className="flex flex-col gap-2" data-testid="hours-editor">
      <ul className="flex flex-col divide-y divide-line rounded-input border border-line">
        {DAYS.map((d, i) => {
          const ranges = value[d];
          const open = ranges.length > 0;
          return (
            <li key={d} className="grid items-start gap-2 px-3 py-2 sm:grid-cols-[7.5rem_1fr]">
              <label className="flex items-center gap-2 pt-2 text-sm font-semibold">
                <input type="checkbox" checked={open} onChange={(e) => setDay(d, e.target.checked ? [{ from: "09:00", to: "18:00" }] : [])} className="h-4 w-4 accent-[var(--coral)]" />
                {p.days[i]}
              </label>
              {open ? (
                <div className="flex flex-col gap-1.5">
                  {ranges.map((r, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <DateTimePicker mode="time" value={r.from} onChange={(v) => v && setDay(d, ranges.map((x, k) => (k === j ? { ...x, from: v } : x)))} className="w-28" aria-label={`${p.days[i]} ${t.deals.from}`} />
                      <span className="text-muted">–</span>
                      <DateTimePicker mode="time" value={r.to} onChange={(v) => v && setDay(d, ranges.map((x, k) => (k === j ? { ...x, to: v } : x)))} className="w-28" aria-label={`${p.days[i]} ${t.deals.to}`} />
                      <button type="button" onClick={() => setDay(d, ranges.filter((_, k) => k !== j))} className="rounded-input p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label={t.design.remove}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {ranges.length < 3 ? (
                    <button type="button" onClick={() => setDay(d, [...ranges, { from: ranges.at(-1)?.to ?? "14:00", to: "18:00" }])} className="inline-flex items-center gap-1 self-start rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-ink">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> {p.hoursAdd}
                    </button>
                  ) : null}
                </div>
              ) : (
                <span className="pt-2 text-sm text-muted">{p.hoursClosed}</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => onChange(copyDay(value, "1", ["2", "3", "4", "5"]))} className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-ink">
          <Copy className="h-3.5 w-3.5" aria-hidden /> {p.hoursCopyWeek}
        </button>
        <button type="button" onClick={() => onChange(copyDay(value, "1", ["2", "3", "4", "5", "6", "7"]))} className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-ink">
          <Copy className="h-3.5 w-3.5" aria-hidden /> {p.hoursCopyAll}
        </button>
        <button type="button" onClick={() => onChange(null)} className="ml-auto rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-danger/10 hover:text-danger">
          {p.hoursClear}
        </button>
      </div>
    </div>
  );
}
