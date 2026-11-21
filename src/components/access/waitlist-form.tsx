"use client";

import { ArrowRight, Building2, Check, Megaphone, MapPin, MoreHorizontal, Sparkles, Store, Users, type LucideIcon } from "lucide-react";
import { Turnstile } from "@/components/access/turnstile";
import { useActionState, useEffect, useState } from "react";
import { joinWaitlistAction } from "@/app/p/[locale]/(auth)/access-actions";
import { Input, Notice, buttonClass } from "@/components/ui";
import { USE_CASES, type UseCase } from "@/lib/access/rules";
import { useI18n } from "@/lib/i18n/context";

const CHIP_ICONS: Record<UseCase, LucideIcon> = {
  media: Megaphone,
  association: Users,
  city_tourism: MapPin,
  retail_gastro: Store,
  agency: Sparkles,
  other: MoreHorizontal,
};

/**
 * Waitlist form (landing page and /signup), kept short on purpose: what describes you (tappable chips,
 * optional), email, company (optional), consent. Name, website and message are no longer asked; the
 * server still accepts them. Spam protection: a hidden honeypot field, the time since render, rate
 * limits on the server and Cloudflare Turnstile when a site key is set.
 */
export function WaitlistForm({ turnstileKey, compact = false }: { turnstileKey: string | null; compact?: boolean }) {
  const { t, locale } = useI18n();
  const w = t.access.waitlist;
  // Every submit uses up the Turnstile token: a new widget (key) per attempt.
  const [attempt, setAttempt] = useState(0);
  const [state, action, pending] = useActionState(joinWaitlistAction, null);
  // Held in state: a hidden input's DOM value falls back to its defaultValue «0» on every re-render, which
  // made real people look like bots. The submit button waits until the time is set (page interactive).
  const [renderedAt, setRenderedAt] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock may only be read in the browser
  useEffect(() => setRenderedAt(Date.now()), []);
  const ready = renderedAt > 0;

  if (state?.sent)
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-2 px-5 py-8 text-center" data-testid="waitlist-sent">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent,#111)]">
          <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
        </span>
        <p className="text-xl font-semibold">{w.sentTitle}</p>
        <p className="max-w-sm text-sm text-muted">
          {w.sentText} {w.sentNext}
        </p>
      </div>
    );
  const error = state && !state.sent ? w[state.error] : null;

  return (
    <form action={action} onSubmit={() => setAttempt((a) => a + 1)} className="flex flex-col gap-5 text-left" data-testid="waitlist-form">
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

      <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-medium ${compact ? "" : "justify-center"}`} data-testid="waitlist-perks">
        {w.perks.map((p) => (
          <li key={p} className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-[var(--accent)]" strokeWidth={3} aria-hidden />
            {p}
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-2.5">
        <legend className={`mb-2.5 w-full text-sm font-semibold ${compact ? "" : "text-center"}`}>{w.pick}</legend>
        <div className={`flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`} data-testid="waitlist-chips">
          {USE_CASES.map((u) => {
            const Icon = CHIP_ICONS[u];
            return (
              <label
                key={u}
                className="flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 py-2 text-sm font-medium transition hover:border-[var(--accent)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]"
              >
                <input type="radio" name="useCase" value={u} className="sr-only" />
                <Icon className="h-4 w-4" aria-hidden />
                {w.chips[u]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder={w.emailPlaceholder} aria-label={w.email} data-testid="waitlist-email" />
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="company" autoComplete="organization" maxLength={120} placeholder={w.companyPlaceholder} aria-label={w.company} className="pl-9" />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" data-testid="waitlist-consent" />
        <span>
          {w.consentShort}
          <a href="/legal/privacy" target="_blank" className="font-semibold text-ink underline">
            {w.consentLink}
          </a>
          {w.consentShortAfter}
        </span>
      </label>
      {turnstileKey ? <Turnstile key={attempt} siteKey={turnstileKey} locale={locale} theme="auto" /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending || !ready} className={`${buttonClass.primary} group w-full gap-2 py-3.5 text-base ${compact ? "" : "sm:mx-auto sm:w-auto sm:px-10"}`} data-testid="waitlist-submit">
        {pending ? t.common.loading : w.submit}
        {pending ? null : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />}
      </button>
    </form>
  );
}
