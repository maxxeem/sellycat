"use client";

import { Turnstile } from "@/components/access/turnstile";
import { useActionState, useEffect, useState } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { sendContactMessage } from "./actions";

export function ContactForm({ turnstileKey }: { turnstileKey: string | null }) {
  const { t, locale } = useI18n();
  const c = t.contact;
  // Every submit uses up the Turnstile token: a new widget (key) per attempt.
  const [attempt, setAttempt] = useState(0);
  const [state, action, pending] = useActionState(sendContactMessage, null);
  // Held in state: a hidden input's DOM value falls back to its defaultValue «0» on every re-render, which
  // made real people look like bots. The submit button waits until the time is set (page interactive).
  const [renderedAt, setRenderedAt] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock may only be read in the browser
  useEffect(() => setRenderedAt(Date.now()), []);
  const ready = renderedAt > 0;

  if (state?.ok)
    return (
      <div role="status" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-6" data-testid="contact-sent">
        <p className="text-lg font-semibold">{c.sentTitle}</p>
        <p className="text-sm text-muted">{c.sentText}</p>
      </div>
    );
  return (
    <form action={action} onSubmit={() => setAttempt((a) => a + 1)} className="flex flex-col gap-4" data-testid="contact-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rendered_at" value={renderedAt} readOnly />
      {/* Honeypot: invisible for people, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        {/* A name and label no autofill recognises (a «Fax» field was filled by browsers, turning people into bots). */}
        <label>
          Leave empty
          <input type="text" name="sc_hp" tabIndex={-1} autoComplete="off" data-1p-ignore data-lpignore="true" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.name}>
          <Input name="name" autoComplete="name" required maxLength={120} data-testid="contact-name" />
        </Field>
        <Field label={c.email}>
          <Input name="email" type="email" autoComplete="email" required maxLength={254} data-testid="contact-email" />
        </Field>
      </div>
      <Field label={`${c.company} (${c.optional})`}>
        <Input name="company" autoComplete="organization" maxLength={160} />
      </Field>
      <Field label={c.message}>
        <textarea name="message" rows={6} required minLength={5} maxLength={4000} className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-base sm:text-sm" data-testid="contact-message" />
      </Field>
      <p className="text-xs text-muted">
        {c.privacyBefore}
        <a href="/legal/privacy" target="_blank" className="font-semibold text-ink underline">
          {c.privacyLink}
        </a>
        {c.privacyAfter}
      </p>
      {turnstileKey ? <Turnstile key={attempt} siteKey={turnstileKey} locale={locale} theme="light" /> : null}
      {state && !state.ok ? <Notice tone="error">{c.errors[state.error]}</Notice> : null}
      <button type="submit" disabled={pending || !ready} className={`${buttonClass.primary} self-start`} data-testid="contact-submit">
        {pending ? t.common.loading : c.submit}
      </button>
    </form>
  );
}
