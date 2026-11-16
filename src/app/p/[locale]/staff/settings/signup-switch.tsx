"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";
import { setSignupMode } from "../actions";

export function SignupSwitch({ mode, canEdit }: { mode: "open" | "paused"; canEdit: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const options = [
    { value: "paused", label: t.staff.signupPaused },
    { value: "open", label: t.staff.signupOpen },
  ] as const;
  return (
    <div role="radiogroup" aria-label={t.staff.signupMode} className="inline-flex rounded-button border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={mode === o.value}
          disabled={!canEdit || pending}
          onClick={() => start(() => setSignupMode(o.value))}
          data-testid={`signup-${o.value}`}
          className={`rounded-input px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed ${mode === o.value ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
