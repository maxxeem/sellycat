"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import { joinWaitlistAction } from "@/app/p/[locale]/(auth)/access-actions";
import { Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { USE_CASES } from "@/lib/access/rules";
import { useI18n } from "@/lib/i18n/context";

/**
 * Waitlist form (landing page and /signup). Spam protection: a hidden honeypot field, the time
 * since render, rate limits on the server and Cloudflare Turnstile when a site key is set.
 */
export function WaitlistForm({ turnstileKey, compact = false }: { turnstileKey: string | null; compact?: boolean }) {
  const { t, locale } = useI18n();
  const w = t.access.waitlist;
  const [state, action, pending] = useActionState(joinWaitlistAction, null);
  // Time the form appeared in the browser (bots submit instantly); written straight into the field.
  const renderedAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renderedAt.current) renderedAt.current.value = String(Date.now());
  }, []);

  if (state?.sent)
    return (
      <div role="status" className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-5 text-left" data-testid="waitlist-sent">
        <p className="text-lg font-semibold">{w.sentTitle}</p>
        <p className="text-sm text-muted">{w.sentText}</p>
      </div>
    );
  const error = state && !state.sent ? w[state.error] : null;
  const opt = (label: string) => `${label} (${w.optional})`;

  return (
    <form action={action} className="flex flex-col gap-4 text-left" data-testid="waitlist-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rendered_at" ref={renderedAt} defaultValue="0" />
      {/* Honeypot: invisible for people, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Fax
          <input type="text" name="fax" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label={w.email}>
        <Input name="email" type="email" autoComplete="email" required maxLength={254} data-testid="waitlist-email" />
      </Field>
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Field label={opt(w.name)}>
          <Input name="name" autoComplete="name" maxLength={120} />
        </Field>
        <Field label={opt(w.company)}>
          <Input name="company" autoComplete="organization" maxLength={120} />
        </Field>
        <Field label={opt(w.website)} error={state && !state.sent && state.error === "websiteInvalid" ? w.websiteInvalid : undefined}>
          <Input name="website" inputMode="url" autoComplete="url" maxLength={200} placeholder="firma.ch" />
        </Field>
        <Field label={opt(w.useCase)}>
          <Select name="useCase" defaultValue="" aria-label={w.useCase}>
            <option value="">{w.useCaseNone}</option>
            {USE_CASES.map((u) => (
              <option key={u} value={u}>
                {w.useCases[u]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={opt(w.message)} hint={w.messageHint}>
        <textarea name="message" rows={3} maxLength={1000} className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-base sm:text-sm" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0 accent-[var(--accent)]" data-testid="waitlist-consent" />
        <span>
          {w.consentBefore}
          <a href="/legal/privacy" target="_blank" className="font-semibold text-ink underline">
            {w.consentLink}
          </a>
          {w.consentAfter}
        </span>
      </label>
      {turnstileKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile" data-sitekey={turnstileKey} data-language={locale} data-theme="auto" />
        </>
      ) : null}
      {error && state && !state.sent && state.error !== "websiteInvalid" ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`} data-testid="waitlist-submit">
        {pending ? t.common.loading : w.submit}
      </button>
    </form>
  );
}
