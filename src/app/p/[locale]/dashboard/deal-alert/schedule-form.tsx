"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DateTimePicker } from "@/components/date-time-picker";
import { Notice, buttonClass } from "@/components/ui";
import { ALERT_MODES, type AlertSchedule } from "@/lib/alerts/schedule";
import { useI18n } from "@/lib/i18n/context";
import { saveSchedule } from "./actions";

const WEEKDAYS = { de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };

/** How and when new deals go out by themselves. */
export function ScheduleForm({ initial }: { initial: AlertSchedule }) {
  const { t, locale } = useI18n();
  const s = t.dealAlertAdmin.auto;
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<AlertSchedule>) => {
    setForm((f) => ({ ...f, ...patch }));
    setNote(null);
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label={s.title}>
        {ALERT_MODES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={form.mode === m} onClick={() => set({ mode: m })} className={`flex flex-col items-start gap-0.5 rounded-input border p-3 text-left text-sm transition ${form.mode === m ? "border-ink bg-surface ring-2 ring-accent/40" : "border-line hover:border-muted"}`} data-testid={`alert-mode-${m}`}>
            <span className="font-semibold">{s.modes[m]}</span>
            <span className="text-xs text-muted">{s.hints[m]}</span>
          </button>
        ))}
      </div>
      {form.mode === "instant" ? (
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.window)} onChange={(e) => set({ window: e.target.checked ? { from: "08:00", to: "20:00" } : null })} className="h-4 w-4 accent-[var(--coral)]" data-testid="alert-window" />
            {s.window}
          </label>
          {form.window ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <DateTimePicker mode="time" clearable={false} value={form.window.from} onChange={(from) => set({ window: { ...form.window!, from } })} className="w-32" aria-label={s.from} />
                <span>–</span>
                <DateTimePicker mode="time" clearable={false} value={form.window.to} onChange={(to) => set({ window: { ...form.window!, to } })} className="w-32" aria-label={s.to} />
              </div>
              <p className="text-xs text-muted">{s.windowHint}</p>
            </>
          ) : null}
        </div>
      ) : null}
      {form.mode === "scheduled" ? (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">{s.days}</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS[locale].map((name, i) => {
                const on = form.weekdays.includes(i + 1);
                return (
                  <button key={name} type="button" aria-pressed={on} onClick={() => set({ weekdays: on ? form.weekdays.filter((d) => d !== i + 1) : [...form.weekdays, i + 1].sort((a, b) => a - b) })} className={`h-9 w-11 rounded-input text-xs font-semibold ${on ? "bg-ink text-surface-2" : "border border-line text-muted hover:border-muted"}`}>
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">{s.time}</span>
            <DateTimePicker mode="time" clearable={false} value={form.sendAt} onChange={(sendAt) => set({ sendAt })} className="w-32" aria-label={s.time} />
          </div>
          <p className="text-xs text-muted">{s.scheduledHint}</p>
        </div>
      ) : null}
      {form.mode === "manual" ? <p className="text-sm text-muted">{s.manualHint}</p> : null}
      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
      <button
        type="button"
        className={`${buttonClass.primary} self-start`}
        disabled={pending || !dirty}
        data-testid="alert-schedule-save"
        onClick={() =>
          start(async () => {
            const r = await saveSchedule(form);
            if (!r.ok) return setNote({ tone: "error", text: s.errors[r.error] });
            setSaved(form);
            setNote({ tone: "success", text: t.common.saved });
            router.refresh();
          })
        }
      >
        {pending ? "…" : t.common.save}
      </button>
    </div>
  );
}
