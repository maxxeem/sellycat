"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { clampTime, formatValue, joinValue, monthGrid, shiftMonth, splitValue, zurichNow, type PickerMode } from "@/lib/date-picker";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Date / date-and-time / time field with its own popup: month calendar (Monday first), hour and
 * minute columns, and "Now" (or "Today") that takes the current Zurich time. Same value format
 * as the native inputs, so forms keep working unchanged.
 */
export function DateTimePicker({
  value,
  onChange,
  mode = "datetime",
  min,
  placeholder,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  mode?: PickerMode;
  /** Earliest selectable day ("YYYY-MM-DD"). */
  min?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const { t, locale } = useI18n();
  const c = t.common;
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const parts = splitValue(value, mode);
  // The current day is only read when the popup opens (never while rendering on the server).
  const [today, setToday] = useState("");
  const [view, setView] = useState({ year: 2000, month: 0 });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const now = zurichNow().date;
      setToday(now);
      const d = parts.date ?? now;
      setView({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) - 1 });
    }
    setOpen(!open);
  };
  const setDate = (d: string) => onChange(joinValue(d, parts.time, mode));
  const setTime = (h: number, m: number) => onChange(joinValue(parts.date ?? (today || zurichNow().date), clampTime(h, m), mode));
  const now = () => {
    const n = zurichNow();
    onChange(joinValue(n.date, n.time, mode));
    setView({ year: Number(n.date.slice(0, 4)), month: Number(n.date.slice(5, 7)) - 1 });
  };
  const [h, m] = (parts.time ?? "").split(":").map(Number);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale === "de" ? "de-CH" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 23 + i))));
  const monthLabel = new Intl.DateTimeFormat(locale === "de" ? "de-CH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(view.year, view.month, 1)));
  const shown = formatValue(value, mode, locale === "de" ? "de" : "en");
  const Icon = mode === "time" ? Clock : CalendarDays;

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        className="flex w-full items-center gap-2 rounded-input border border-line bg-surface-2 px-3 py-2.5 text-left text-base outline-none transition hover:border-ink focus:border-ink focus:ring-2 focus:ring-accent/30 sm:text-sm"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className={`min-w-0 flex-1 truncate ${shown ? "" : "text-muted"}`}>{shown || placeholder || (mode === "time" ? c.pickTime : c.pickDate)}</span>
      </button>

      {open ? (
        <div
          id={id}
          role="dialog"
          aria-label={mode === "time" ? c.pickTime : c.pickDate}
          className="absolute left-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-2 p-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]"
          data-testid="date-picker"
        >
          {mode !== "time" ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => setView(shiftMonth(view.year, view.month, -1))} className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink" aria-label={c.prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold capitalize">{monthLabel}</span>
                <button type="button" onClick={() => setView(shiftMonth(view.year, view.month, 1))} className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink" aria-label={c.nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted">
                {weekdays.map((w) => (
                  <span key={w} className="py-1">
                    {w.replace(".", "")}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid(view.year, view.month)
                  .flat()
                  .map((d, i) => {
                    if (!d) return <span key={`e${i}`} />;
                    const selected = d === parts.date;
                    const disabled = Boolean(min && d < min);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => setDate(d)}
                        aria-pressed={selected}
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
                          selected ? "bg-ink font-semibold text-surface-2" : d === today ? "font-semibold text-accent-text ring-1 ring-inset ring-accent/40 hover:bg-surface" : "hover:bg-surface"
                        } disabled:cursor-not-allowed disabled:opacity-30`}
                      >
                        {Number(d.slice(8))}
                      </button>
                    );
                  })}
              </div>
            </>
          ) : null}

          {mode !== "date" ? (
            <div className={`grid grid-cols-2 gap-2 ${mode === "datetime" ? "mt-3 border-t border-line pt-3" : ""}`}>
              {(
                [
                  [c.hour, HOURS, h, (x: number) => setTime(x, Number.isNaN(m) ? 0 : m)],
                  [c.minute, MINUTES, m, (x: number) => setTime(Number.isNaN(h) ? 12 : h, x)],
                ] as const
              ).map(([label, list, current, pick]) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="px-1 text-[11px] font-semibold uppercase text-muted">{label}</span>
                  <div className="grid max-h-36 grid-cols-4 gap-1 overflow-y-auto pr-1">
                    {list.map((x) => (
                      <button
                        key={x}
                        type="button"
                        onClick={() => pick(x)}
                        aria-pressed={current === x}
                        className={`rounded-lg py-1.5 text-sm tabular-nums transition ${current === x ? "bg-ink font-semibold text-surface-2" : "hover:bg-surface"}`}
                      >
                        {pad(x)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {parts.time && !Number.isNaN(m) && m % 5 !== 0 ? <p className="col-span-2 px-1 text-xs text-muted">{parts.time}</p> : null}
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <button type="button" onClick={now} className="rounded-full bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent-text hover:bg-accent/20" data-testid="date-picker-now">
              {mode === "date" ? c.today : c.now}
            </button>
            {value ? (
              <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink">
                <X className="h-3.5 w-3.5" aria-hidden /> {c.clear}
              </button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-surface-2">
              {c.done}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
