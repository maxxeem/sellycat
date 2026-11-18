import { Suspense } from "react";
import { Badge, Card, Notice, PageHeader, Skeleton } from "@/components/ui";
import { roleAtLeast } from "@/lib/auth/tenants";
import { currencyForCountry, type Currency } from "@/lib/billing/currency";
import { currencyFromRequest } from "@/lib/billing/currency-server";
import { feePercent } from "@/lib/billing/plans";
import { customerCurrency, loadPlans, stripeConfigured } from "@/lib/billing/stripe";
import { requireTenant } from "@/lib/dashboard/context";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingPanel } from "./billing-panel";

export const metadata = { title: "Abo" };

export default async function BillingPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/billing">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.subscription.title} description={t.subscription.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Billing t={t} locale={locale === "en" ? "en" : "de"} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const NOTICES = ["success", "cancel", "changed", "scheduled"] as const;

async function Billing({ t, locale, searchParams }: { t: Dictionary; locale: "de" | "en"; searchParams: PageProps<"/p/[locale]/dashboard/billing">["searchParams"] }) {
  const { tenant } = await requireTenant("editor");
  const s = t.subscription;
  const sp = await searchParams;
  const notice = NOTICES.find((n) => n === sp.checkout);
  const admin = createAdminClient();
  const [{ data: row }, plans, { count: live }] = await Promise.all([
    admin.from("tenants").select("plan_id, billing, billing_status, billing_interval, current_period_end, cancel_at_period_end, pending_plan_id, pending_interval, pending_at, stripe_customer_id, fee_override_bps").eq("id", tenant.id).single(),
    loadPlans(),
    admin.from("deals").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("state", "published").is("archived_at", null),
  ]);
  if (!row) return null;
  const current = plans.find((p) => p.id === row.plan_id) ?? plans[0];
  const pending = plans.find((p) => p.id === row.pending_plan_id) ?? null;
  const country = row.billing && typeof row.billing === "object" ? (row.billing as Record<string, unknown>).country : null;
  const currency: Currency = (await customerCurrency(row.stripe_customer_id)) ?? (typeof country === "string" && country ? currencyForCountry(country) : await currencyFromRequest());
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" }) : "");
  const canManage = roleAtLeast(tenant.role, "admin");
  const status = row.billing_status as "none" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  const fee = row.fee_override_bps ?? current.feeBps;

  return (
    <div className="flex flex-col gap-6">
      {notice ? <Notice tone={notice === "cancel" ? "info" : "success"}>{s.notices[notice]}</Notice> : null}
      {!stripeConfigured() ? <Notice tone="warning">{s.notConfigured}</Notice> : null}
      {status === "past_due" || status === "unpaid" ? <Notice tone="error">{s.pastDue}</Notice> : null}

      <Card title={s.current}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold" data-testid="billing-plan">{current.name}</span>
            {status !== "none" ? <Badge tone={status === "active" || status === "trialing" ? "green" : status === "past_due" || status === "unpaid" ? "red" : "neutral"}>{s.status[status]}</Badge> : null}
            {row.billing_interval ? <Badge>{s.intervals[row.billing_interval as "monthly" | "yearly"]}</Badge> : null}
          </div>
          <ul className="grid gap-1 text-sm text-muted sm:grid-cols-2">
            <li>{fmt(s.feeLine, { fee: feePercent(fee) })}</li>
            <li>{current.limits.deals_live === null ? fmt(s.dealsUnlimited, { live: live ?? 0 }) : fmt(s.dealsUsage, { live: live ?? 0, limit: current.limits.deals_live })}</li>
            {status === "trialing" && row.current_period_end ? <li>{fmt(s.trialUntil, { date: date(row.current_period_end) })}</li> : null}
            {status === "active" && row.current_period_end && !row.cancel_at_period_end ? <li>{fmt(s.renews, { date: date(row.current_period_end) })}</li> : null}
            {row.cancel_at_period_end && row.current_period_end ? <li className="font-semibold text-ink">{fmt(s.endsOn, { date: date(row.current_period_end) })}</li> : null}
            {current.limits.branding ? <li>{s.withBranding}</li> : null}
          </ul>
          {pending && row.pending_at ? <Notice tone="info">{fmt(s.pending, { plan: pending.name, date: date(row.pending_at) })}</Notice> : null}
        </div>
      </Card>

      <BillingPanel
        plans={plans.filter((p) => p.isPublic || p.id === current.id).map((p) => ({ id: p.id, name: p.name, sortOrder: p.sortOrder, isPublic: p.isPublic, contactOnly: p.contactOnly, limits: p.limits, prices: p.prices, copy: p.copy, feeBps: p.feeBps, feeFixed: p.feeFixed, trialDays: p.trialDays, bookable: { monthly: Boolean(p.stripe.price_month_id), yearly: Boolean(p.stripe.price_year_id) } }))}
        currentPlanId={current.id}
        currentInterval={(row.billing_interval as "monthly" | "yearly" | null) ?? null}
        hasSubscription={status !== "none" && status !== "canceled"}
        hasPending={Boolean(pending)}
        hasCustomer={Boolean(row.stripe_customer_id)}
        currency={currency}
        locale={locale}
        canManage={canManage && stripeConfigured()}
      />
    </div>
  );
}
