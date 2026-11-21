"use client";

import { Turnstile } from "@/components/access/turnstile";
import { useActionState, useEffect, useRef, useState } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { sendContactMessage } from "./actions";

export function ContactForm({ turnstileKey }: { turnstileKey: string | null }) {
  const { t, locale } = useI18n();
  const c = t.contact;
  // Every submit uses up the Turnstile token: a new widget (key) per attempt.
  const [attempt, setAttempt] = useState(0);
  const [state, action, pending] = useActionState(sendContactMessage, null);
  // When the form appeared in the browser (bots submit at once); written straight into the field.
  const renderedAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renderedAt.current) renderedAt.current.value = String(Date.now());
  }, []);

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
      <input type="hidden" name="rendered_at" ref={renderedAt} defaultValue="0" />
      {/* Honeypot: invisible for people, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Fax
          <input type="text" name="fax" tabIndex={-1} autoComplete="off" />
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
      <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`} data-testid="contact-submit">
        {pending ? t.common.loading : c.submit}
      </button>
    </form>
  );
}
