"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, Notice, buttonClass } from "@/components/ui";
import type { Currency } from "@/lib/billing/currency";
import { feePercent, formatPrice, isFree, yearlyPerMonth, type Interval, type Plan } from "@/lib/billing/plans";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { choosePlan, keepPlan, openPortal, type BillingResult } from "./actions";

type PanelPlan = Plan & { bookable: Record<Interval, boolean> };

/** Plan choice (upgrade now, downgrade at period end), keep a scheduled change, Stripe portal. */
export function BillingPanel(props: { plans: PanelPlan[]; currentPlanId: string; currentInterval: Interval | null; hasSubscription: boolean; hasPending: boolean; hasCustomer: boolean; currency: Currency; locale: "de" | "en"; canManage: boolean }) {
  const { t } = useI18n();
  const s = t.subscription;
  const [interval, setInterval] = useState<Interval>(props.currentInterval ?? "yearly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const order = props.plans.map((p) => p.id);
  const rank = (id: string) => order.indexOf(id);

  const run = (key: string, fn: () => Promise<BillingResult>) => {
    setBusy(key);
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) setError(r.error === "stripe" && r.detail ? `${s.errors.stripe} ${r.detail}` : s.errors[r.error]);
      } catch (e) {
        // redirect() from the action lands here as a navigation; anything else is a real error.
        if (!(e instanceof Error && /NEXT_REDIRECT/.test(e.message))) setError(s.errors.stripe);
      } finally {
        setBusy(null);
      }
    });
  };

  const label = (p: PanelPlan) => {
    if (p.id === props.currentPlanId && (props.currentInterval === interval || isFree(p))) return s.yourPlan;
    if (p.contactOnly) return s.contact;
    if (isFree(p)) return s.toFree;
    if (!props.hasSubscription) return p.trialDays > 0 ? fmt(s.startTrial, { days: p.trialDays }) : s.choose;
    return rank(p.id) > rank(props.currentPlanId) || (p.id === props.currentPlanId && interval === "yearly") ? s.upgrade : s.downgrade;
  };

  return (
    <Card
      title={s.plans}
      actions={
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label={s.billingLabel}>
          {(["monthly", "yearly"] as const).map((i) => (
            <button key={i} type="button" role="radio" aria-checked={interval === i} onClick={() => setInterval(i)} className={`rounded-full px-3 py-1 text-sm font-semibold ${interval === i ? "bg-ink text-surface-2" : "text-muted"}`}>
              {s.intervals[i]}
            </button>
          ))}
        </div>
      }
    >
      {error ? <div className="mb-4"><Notice tone="error">{error}</Notice></div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {props.plans.map((p) => {
          const current = p.id === props.currentPlanId;
          const free = isFree(p);
          const price = interval === "yearly" ? yearlyPerMonth(p.prices, props.currency) : (p.prices.monthly[props.currency] ?? null);
          const text = label(p);
          const disabled = !props.canManage || busy !== null || text === s.yourPlan;
          return (
            <div key={p.id} className={`flex flex-col gap-3 rounded-card border p-5 ${current ? "border-ink ring-2 ring-ink" : "border-line"}`} data-testid={`billing-plan-${p.id}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold">{p.name}</span>
                {current ? <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-on-coral">{s.yourPlan}</span> : null}
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">
                  {p.contactOnly ? s.onRequest : free ? formatPrice(0, props.currency) : price !== null ? formatPrice(price, props.currency) : "–"}
                  {!p.contactOnly && !free && price !== null ? <span className="text-sm font-medium text-muted"> {s.perMonth}</span> : null}
                </p>
                <p className="text-sm font-semibold">{fmt(s.feeShort, { fee: feePercent(p.feeBps) })}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 text-sm">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{p.limits.deals_live === null ? s.features.dealsUnlimited : fmt(s.features.deals, { count: p.limits.deals_live })}</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{p.limits.custom_domain ? s.features.domain : s.features.subdomain}</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{p.limits.branding ? s.features.branding : s.features.noBranding}</li>
              </ul>
              {p.contactOnly ? (
                <Link href="/pricing" className={buttonClass.secondary}>{s.contact}</Link>
              ) : free ? (
                <button type="button" className={buttonClass.secondary} disabled={disabled || !props.hasSubscription} onClick={() => run("portal", openPortal)} title={props.hasSubscription ? s.toFreeHint : undefined}>
                  {current ? s.yourPlan : s.toFree}
                </button>
              ) : (
                <button type="button" className={current ? buttonClass.secondary : buttonClass.primary} disabled={disabled || !p.bookable[interval]} onClick={() => run(p.id, () => choosePlan(p.id, interval))} data-testid={`billing-choose-${p.id}`}>
                  {busy === p.id ? "…" : text}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {props.hasPending && props.canManage ? (
          <button type="button" className={buttonClass.secondary} disabled={busy !== null} onClick={() => run("keep", keepPlan)}>
            {s.keep}
          </button>
        ) : null}
        {props.hasCustomer && props.canManage ? (
          <button type="button" className={buttonClass.ghost} disabled={busy !== null} onClick={() => run("portal", openPortal)} data-testid="billing-portal">
            {busy === "portal" ? "…" : s.portal}
          </button>
        ) : null}
        <p className="text-xs text-muted">{props.canManage ? s.footnote : s.adminOnly}</p>
      </div>
    </Card>
  );
}
