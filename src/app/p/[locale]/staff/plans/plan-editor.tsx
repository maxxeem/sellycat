"use client";

import { useActionState } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { CURRENCIES } from "@/lib/billing/currency";
import { INTERVALS, LIMIT_FLAGS, LIMIT_NUMBERS, type Plan } from "@/lib/billing/plans";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { savePlan, type PlanFormState } from "./actions";

const amount = (v: number | undefined) => (v === undefined ? "" : Number.isInteger(v) ? String(v) : v.toFixed(2));

function Check({ name, label, hint, defaultChecked, disabled }: { name: string; label: string; hint?: string; defaultChecked: boolean; disabled: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** One plan: name, visibility, prices (monthly/yearly × CHF/EUR/USD), fee, limits, pricing-page copy. */
export function PlanEditor({ plan, canEdit }: { plan: Plan; canEdit: boolean }) {
  const { t } = useI18n();
  const p = t.staff.plans;
  const [state, action, pending] = useActionState<PlanFormState, FormData>(savePlan.bind(null, plan.id), null);
  const off = !canEdit;
  return (
    <form action={action} className="flex flex-col gap-5" data-testid={`plan-${plan.id}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={p.name}>
          <Input name="name" defaultValue={plan.name} maxLength={40} required disabled={off} />
        </Field>
        <Field label={p.feeLabel} hint={p.feeHint}>
          <Input name="fee" inputMode="decimal" defaultValue={String(plan.feeBps / 100)} disabled={off} data-testid={`plan-${plan.id}-fee`} />
        </Field>
        <Field label={p.trial} hint={p.trialHint}>
          <Input name="trial" type="number" min={0} max={90} defaultValue={String(plan.trialDays)} disabled={off} />
        </Field>
        <div className="flex flex-col gap-2 pt-6">
          <Check name="public" label={p.public} hint={p.publicHint} defaultChecked={plan.isPublic} disabled={off} />
          <Check name="contact" label={p.contact} hint={p.contactHint} defaultChecked={plan.contactOnly} disabled={off} />
        </div>
      </div>

      <div className="rounded-input border border-line p-4">
        <p className="text-sm font-semibold">{p.prices}</p>
        <p className="mb-3 text-xs text-muted">{p.pricesHint}</p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="py-1.5 pr-3">{p.interval}</th>
                {CURRENCIES.map((c) => (
                  <th key={c} className="py-1.5 pr-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INTERVALS.map((i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-2 pr-3 font-medium">{p.intervals[i]}</td>
                  {CURRENCIES.map((c) => (
                    <td key={c} className="py-2 pr-3">
                      <Input name={`price_${i}_${c}`} inputMode="decimal" defaultValue={amount(plan.prices[i][c])} placeholder="–" aria-label={`${p.intervals[i]} ${c}`} className="w-28 tabular-nums" disabled={off} data-testid={`plan-${plan.id}-${i}-${c}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {LIMIT_NUMBERS.map((k) => (
          <Field key={k} label={p.limits[k]} hint={p.unlimitedHint}>
            <Input name={`limit_${k}`} type="number" min={0} defaultValue={plan.limits[k] === null ? "" : String(plan.limits[k])} placeholder="∞" disabled={off} />
          </Field>
        ))}
        <Field label={p.shopsIncluded} hint={p.shopsHint}>
          <Input name="limit_shops" type="number" min={1} max={50} defaultValue={String(plan.limits.shops)} disabled={off} />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-2 lg:pt-6">
          {LIMIT_FLAGS.map((k) => (
            <Check key={k} name={`flag_${k}`} label={p.flags[k]} defaultChecked={plan.limits[k]} disabled={off} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["de", "en"] as const).map((l) => (
          <div key={l} className="flex flex-col gap-3 rounded-input border border-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{fmt(p.copy, { lang: l.toUpperCase() })}</p>
            <Field label={p.tagline}>
              <Input name={`tagline_${l}`} defaultValue={plan.copy[l].tagline} maxLength={160} disabled={off} />
            </Field>
            <Field label={p.badge} hint={p.badgeHint}>
              <Input name={`badge_${l}`} defaultValue={plan.copy[l].badge} maxLength={30} disabled={off} />
            </Field>
          </div>
        ))}
      </div>

      {state?.error ? <Notice tone="error">{p.errors[state.error as keyof typeof p.errors] ?? t.common.error}</Notice> : null}
      {state?.ok ? (
        <Notice tone={state.stripe === "synced" || state.stripe === "skipped" ? "success" : "warning"}>
          {state.stripe === "synced" ? p.savedSynced : state.stripe === "skipped" ? p.saved : fmt(p.savedStripeFailed, { error: state.stripe ?? "" })}
        </Notice>
      ) : null}
      {canEdit ? (
        <div>
          <button type="submit" disabled={pending} className={buttonClass.primary} data-testid={`plan-${plan.id}-save`}>
            {pending ? t.common.loading : t.common.save}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">{p.superadminOnly}</p>
      )}
    </form>
  );
}
