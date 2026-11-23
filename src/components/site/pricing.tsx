"use client";

import { Check, Gift, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SignupCta } from "@/lib/access/rules";
import type { Currency } from "@/lib/billing/currency";
import { feeMinText, feePercent, withFeeMin, type Interval, type Plan } from "@/lib/billing/plans";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import type { Locale } from "@/lib/i18n/locales";

type Labels = Dictionary["site"]["pricing"];

// Thousands separator by hand: toLocaleString differs between Node and browsers (hydration).
const group = (n: number, locale: Locale) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, locale === "de" ? "’" : ",");
const money = (v: number, locale: Locale) => (Number.isInteger(v) ? group(v, locale) : v.toFixed(2));

/** Feature lines per card: the numbers always, switches only where they first appear ("Everything in X, plus"). */
function cardLines(plan: Plan, previous: Plan | null, l: Labels, currency: Currency): string[] {
  const p = previous?.limits;
  const x = plan.limits;
  const out = [
    withFeeMin(fmt(l.fee, { fee: feePercent(plan.feeBps) }), plan.feeMin, currency, l.feeMin),
    x.deals_live === null ? l.dealsUnlimited : fmt(l.deals, { n: x.deals_live }),
    x.seats === 1 ? l.seatsOne : fmt(l.seats, { n: x.seats ?? "∞" }),
  ];
  if (x.shops > 1) out.push(fmt(l.shops, { n: x.shops }));
  if (!previous) out.push(l.basics);
  if (!x.branding && (p?.branding ?? true)) out.push(l.noBranding);
  if (x.custom_domain && !p?.custom_domain) out.push(l.customDomain);
  if (x.custom_mail_domain && !p?.custom_mail_domain) out.push(l.mailDomain);
  if (x.api && !p?.api) out.push(l.api);
  return out;
}

/**
 * Pricing as on the reference landing (Apollo style): interval switch, airy plan cards on a shared subgrid,
 * the trial as a badge, the fine print as an FAQ. Plans, prices and fees come live from the plan table
 * (staff edits them); the call to action follows the signup mode.
 */
export function Pricing({ plans, labels, locale, currency, cta, ctaLabel }: { plans: Plan[]; labels: Labels; locale: Locale; currency: Currency; cta: SignupCta; ctaLabel: string }) {
  const [interval, setInterval] = useState<Interval>("yearly");
  const l = labels;
  const saving = Math.max(
    0,
    ...plans.map((p) => {
      const m = p.prices.monthly[currency];
      const y = p.prices.yearly[currency];
      return m && y ? Math.round((1 - y / (m * 12)) * 100) : 0;
    }),
  );
  const featured = plans.find((p) => p.copy.de.badge && !p.contactOnly)?.id ?? plans[Math.min(2, plans.length - 1)]?.id;
  const trialDays = Math.max(0, ...plans.filter((p) => !p.contactOnly).map((p) => p.trialDays));
  const perMonth = (p: Plan) => {
    const m = p.prices.monthly[currency] ?? 0;
    const y = p.prices.yearly[currency];
    return interval === "monthly" || y === undefined ? m : Math.round((y / 12) * 100) / 100;
  };
  const href = (p: Plan) => (cta.kind === "start" ? `/signup?plan=${p.id}&interval=${interval}` : cta.href);

  return (
    <section className="site-section mx-auto max-w-6xl px-5 sm:px-8" id="preise" data-testid="pricing">
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{l.title}</h2>
        <p className="max-w-xl text-fg/60">{l.subtitle}</p>
        <div className="inline-flex rounded-full border border-fg/15 bg-fg/[0.04] p-1 text-sm" role="group" aria-label={`${l.yearly} / ${l.monthly}`}>
          {(["yearly", "monthly"] as Interval[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              aria-pressed={interval === i}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 font-medium transition ${interval === i ? "bg-fg text-site-ground" : "text-fg/70 hover:text-fg"}`}
              data-testid={`interval-${i}`}
            >
              {i === "yearly" ? l.yearly : l.monthly}
              {i === "yearly" && saving > 0 ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${interval === i ? "bg-coral text-on-coral" : "bg-coral/20 text-coral-text"}`}>{fmt(l.save, { pct: saving })}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-testid="plan-cards">
        {plans.map((plan, i) => {
          const isFeatured = plan.id === featured;
          const copy = plan.copy[locale];
          const price = perMonth(plan);
          const yearly = plan.prices.yearly[currency];
          return (
            <div key={plan.id} className={`relative row-span-6 grid grid-rows-subgrid rounded-3xl p-7 ${isFeatured ? "bg-fg/[0.06] ring-1 ring-coral/60" : "bg-fg/[0.03] ring-1 ring-fg/10"}`} data-testid={`plan-${plan.id}`}>
              {copy.badge ? (
                <span className={`absolute -top-3 left-7 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${isFeatured ? "bg-coral text-on-coral" : "bg-fg/10 text-fg/80"}`}>{copy.badge}</span>
              ) : null}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 min-h-[2.5rem] text-sm leading-snug text-fg/60">{copy.tagline}</p>
              {plan.contactOnly ? (
                <div className="mt-6" data-testid="plan-on-request">
                  <p className="flex h-12 items-end text-[2rem] font-semibold leading-none tracking-tight">{l.onRequest}</p>
                  <p className="mt-1.5 text-xs leading-snug text-transparent" aria-hidden>
                    ·
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-sm text-fg/50" data-testid="plan-currency">
                      {currency}
                    </span>
                    <span className="text-5xl font-semibold tracking-tight tabular-nums">{money(price, locale)}</span>
                    {price > 0 ? <span className="text-sm text-fg/50">{l.perMonth}</span> : null}
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-fg/50">{price === 0 ? l.free : interval === "yearly" && yearly ? fmt(l.billedYearly, { amount: `${currency} ${money(yearly, locale)}` }) : " "}</p>
                </div>
              )}
              <p className="mt-5 self-start border-t border-fg/10 pt-5 text-sm text-fg/80">
                <span className="font-semibold text-fg">{feePercent(plan.feeBps)}</span> {fmt(l.fee, { fee: "" }).trim()}
                {plan.feeMin > 0 ? <span className="text-fg/55"> · {feeMinText(plan.feeMin, currency, l.feeMin)}</span> : null}
              </p>
              <div className="mt-6 flex flex-col gap-2 self-start">
                {plan.contactOnly ? (
                  <Link href="/pricing" className="inline-flex h-11 items-center justify-center rounded-full border border-fg/25 px-6 text-sm font-semibold text-fg transition hover:bg-fg/10" data-testid="plan-contact">
                    {l.contact}
                  </Link>
                ) : (
                  <Link
                    href={href(plan)}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${isFeatured ? "bg-coral text-on-coral hover:brightness-95" : "border border-fg/25 text-fg hover:bg-fg/10"}`}
                    data-testid="plan-start"
                  >
                    {ctaLabel}
                  </Link>
                )}
              </div>
              <ul className="mt-7 flex flex-col gap-2.5 text-sm">
                {i > 0 ? <li className="text-xs font-semibold uppercase tracking-wide text-fg/45">{fmt(l.plus, { plan: plans[i - 1].name })}</li> : null}
                {cardLines(plan, plans[i - 1] ?? null, l, currency).map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-fg/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-coral-text" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col items-center gap-8" data-testid="pricing-notes">
        {trialDays > 0 ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-coral/10 px-4 py-2 text-center text-sm font-medium text-coral-text ring-1 ring-coral/30">
            <Gift className="h-4 w-4 shrink-0" aria-hidden />
            {fmt(l.trial, { days: trialDays })}
          </p>
        ) : null}
        <div className="w-full max-w-3xl">
          <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-fg/45">{l.faqTitle}</h3>
          <div className="divide-y divide-fg/[0.08] rounded-2xl border border-fg/[0.08] bg-fg/[0.02]">
            {l.faq.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-fg/90 transition hover:text-fg sm:px-6 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus className="h-4 w-4 shrink-0 text-coral-text transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none" aria-hidden />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-fg/60 sm:px-6">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
