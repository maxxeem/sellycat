"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, Input, Notice, buttonClass, inputClass } from "@/components/ui";
import type { Currency } from "@/lib/billing/currency";
import { feePercent, formatPrice, withFeeMin, isFree, yearlyPerMonth, type Interval, type Plan } from "@/lib/billing/plans";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { sendContact, type ContactState } from "./actions";

/** Plan cards with the monthly/yearly switch; Business opens the contact form. */
export function PricingTable({ plans, locale, currency, texts }: { texts: Pick<Dictionary, "pricing"> & { feeMin: string }; plans: Plan[]; locale: "de" | "en"; currency: Currency }) {
  const t = texts.pricing;
  const [interval, setInterval] = useState<Interval>("yearly");
  const [contactPlan, setContactPlan] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, null);
  // Largest yearly saving among the bookable plans (follows the prices staff sets).
  const saving = Math.max(0, ...plans.map((p) => {
    const m = p.prices.monthly[currency];
    const y = p.prices.yearly[currency];
    return m && y ? Math.round((1 - y / (m * 12)) * 100) : 0;
  }));

  const features = (p: Plan) =>
    [
      p.limits.deals_live === null ? t.features.dealsUnlimited : fmt(t.features.deals, { count: p.limits.deals_live }),
      p.limits.seats === null ? t.features.seatsUnlimited : p.limits.seats === 1 ? t.features.seatsOne : fmt(t.features.seats, { count: p.limits.seats }),
      p.limits.shops > 1 ? fmt(t.features.shops, { count: p.limits.shops }) : null,
      t.features.vouchers,
      t.features.wallet,
      p.limits.custom_domain ? t.features.domain : t.features.subdomain,
      p.limits.custom_mail_domain ? t.features.mailDomain : null,
      p.limits.deal_alert ? t.features.dealAlert : null,
      p.limits.api ? t.features.api : null,
      p.limits.branding ? t.features.branding : t.features.noBranding,
    ].filter((f): f is string => Boolean(f));

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label={t.billingLabel}>
          {(["monthly", "yearly"] as const).map((i) => (
            <button key={i} type="button" role="radio" aria-checked={interval === i} onClick={() => setInterval(i)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${interval === i ? "bg-ink text-surface-2" : "text-muted hover:text-ink"}`} data-testid={`pricing-${i}`}>
              {t.intervals[i]}
              {i === "yearly" && saving > 0 ? <span className="ml-1.5 rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-on-coral">{fmt(t.yearlySave, { percent: saving })}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="pricing-plans">
        {plans.map((p) => {
          const copy = p.copy[locale];
          const free = isFree(p);
          const monthly = interval === "yearly" ? yearlyPerMonth(p.prices, currency) : (p.prices.monthly[currency] ?? null);
          return (
            <div key={p.id} className={`relative flex flex-col gap-4 rounded-card border bg-surface p-6 shadow-card ${copy.badge ? "border-ink" : "border-line"}`} data-testid={`pricing-${p.id}`}>
              {copy.badge ? <span className="absolute -top-3 left-6 rounded-full bg-coral px-3 py-1 text-xs font-bold text-on-coral">{copy.badge}</span> : null}
              <div>
                <h2 className="text-xl font-bold">{p.name}</h2>
                {copy.tagline ? <p className="mt-1 min-h-[2.5rem] text-sm text-muted">{copy.tagline}</p> : null}
              </div>
              <div className="min-h-[4.5rem]">
                {p.contactOnly ? (
                  <p className="text-2xl font-bold">{t.onRequest}</p>
                ) : free ? (
                  <p className="text-3xl font-bold">{formatPrice(0, currency)}</p>
                ) : monthly !== null ? (
                  <>
                    <p className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-3xl font-bold tabular-nums">{formatPrice(monthly, currency)}</span>
                      <span className="whitespace-nowrap text-sm font-medium text-muted">{t.perMonth}</span>
                    </p>
                    <p className="text-xs text-muted">{interval === "yearly" && p.prices.yearly[currency] !== undefined ? fmt(t.billedYearly, { amount: formatPrice(p.prices.yearly[currency]!, currency) }) : t.billedMonthly}</p>
                  </>
                ) : (
                  <p className="text-2xl font-bold">–</p>
                )}
                <p className="mt-1 text-sm font-semibold">{withFeeMin(fmt(t.fee, { fee: feePercent(p.feeBps) }), p.feeMin, currency, texts.feeMin)}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {features(p).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              {p.contactOnly ? (
                <button type="button" onClick={() => setContactPlan(p.id)} className={buttonClass.secondary} data-testid={`pricing-${p.id}-contact`}>
                  {t.contact}
                </button>
              ) : (
                <Link href={`/signup?plan=${p.id}&interval=${interval}`} className={copy.badge ? buttonClass.primary : buttonClass.secondary}>
                  {free ? t.startFree : p.trialDays > 0 ? fmt(t.startTrial, { days: p.trialDays }) : t.start}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted">{t.footnote}</p>

      {contactPlan ? (
        <div className="mx-auto w-full max-w-xl rounded-card border border-line bg-surface p-6 shadow-card" id="contact">
          <h2 className="text-lg font-bold">{fmt(t.contactTitle, { plan: plans.find((p) => p.id === contactPlan)?.name ?? "" })}</h2>
          <p className="mb-4 text-sm text-muted">{t.contactIntro}</p>
          {state?.ok ? (
            <Notice tone="success">{t.contactSent}</Notice>
          ) : (
            <form action={action} className="flex flex-col gap-3">
              <input type="hidden" name="plan" value={contactPlan} />
              <input type="hidden" name="locale" value={locale} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t.form.name}>
                  <Input name="name" required maxLength={120} autoComplete="name" />
                </Field>
                <Field label={t.form.company}>
                  <Input name="company" maxLength={160} autoComplete="organization" />
                </Field>
              </div>
              <Field label={t.form.email}>
                <Input name="email" type="email" required maxLength={200} autoComplete="email" />
              </Field>
              <Field label={t.form.message}>
                <textarea name="message" required maxLength={4000} rows={4} className={inputClass} placeholder={t.form.messageHint} />
              </Field>
              {state?.error ? <Notice tone="error">{t.form.errors[state.error]}</Notice> : null}
              <button type="submit" disabled={pending} className={buttonClass.primary}>
                {pending ? "…" : t.form.send}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
