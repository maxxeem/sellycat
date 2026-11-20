"use client";

import { useState, useTransition } from "react";
import { Field, Input, buttonClass } from "@/components/ui";
import { SIGNUP_MODES, type SignupMode } from "@/lib/access/rules";
import { useI18n } from "@/lib/i18n/context";
import { setReminderDaysAction, setSignupModeAction } from "./actions";

export function ModeSwitch({ mode, canEdit }: { mode: SignupMode; canEdit: boolean }) {
  const { t } = useI18n();
  const a = t.staff.access;
  const [pending, start] = useTransition();
  return (
    <div role="radiogroup" aria-label={a.modeTitle} className="grid gap-2 sm:grid-cols-3">
      {SIGNUP_MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          disabled={!canEdit || pending}
          onClick={() => start(() => setSignupModeAction(m))}
          data-testid={`signup-${m}`}
          className={`flex flex-col gap-1 rounded-card border p-4 text-left transition disabled:cursor-not-allowed ${mode === m ? "border-accent bg-accent/10" : "border-line hover:border-ink/40"}`}
        >
          <span className="font-semibold">{a.modes[m]}</span>
          <span className="text-xs text-muted">{a.modeHelp[m]}</span>
        </button>
      ))}
    </div>
  );
}

export function ReminderForm({ days, canEdit }: { days: number; canEdit: boolean }) {
  const { t } = useI18n();
  const a = t.staff.access;
  const [value, setValue] = useState(String(days));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await setReminderDaysAction(Number(value));
          setSaved(true);
        });
      }}
    >
      <Field label={a.reminderDays}>
        <Input type="number" min={0} max={60} value={value} onChange={(e) => (setValue(e.target.value), setSaved(false))} disabled={!canEdit} className="w-28" />
      </Field>
      <button type="submit" disabled={!canEdit || pending} className={buttonClass.secondary}>
        {t.common.save}
      </button>
      {saved ? <span className="pb-2.5 text-sm text-success">{a.saved}</span> : null}
    </form>
  );
}
