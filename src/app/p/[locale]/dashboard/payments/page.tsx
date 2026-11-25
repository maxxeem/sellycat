import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { Badge, Card, Notice, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { fromParams } from "@/lib/i18n/params";
import { roleAtLeast } from "@/lib/auth/tenants";
import { requireTenant } from "@/lib/dashboard/context";
import { connectStatus, stripeDashboardUrl } from "@/lib/payments/map";
import { stripeConfigured } from "@/lib/payments/stripe";
import { formatMoney } from "@/lib/shop/deal-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectStripe, refreshStripe } from "./actions";
import { DisconnectButton } from "./buttons";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/payments">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.payments.title} description={t.payments.intro} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Payments t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const ERRORS = ["config", "denied", "state", "stripe", "in_use"] as const;

async function Payments({ t, locale, searchParams }: { t: Dictionary; locale: string; searchParams: PageProps<"/p/[locale]/dashboard/payments">["searchParams"] }) {
  const { tenant, supabase } = await requireTenant("admin");
  const sp = await searchParams;
  const error = ERRORS.find((e) => e === sp.error);
  const [{ data: account }, { data: fee }] = await Promise.all([
    supabase.from("stripe_accounts").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    createAdminClient().from("tenants").select("currency, fee_override_bps, fee_override_fixed, plans(application_fee_bps, application_fee_fixed, application_fee_min)").eq("id", tenant.id).single(),
  ]);
  const plan = fee?.plans as unknown as { application_fee_bps: number; application_fee_fixed: number; application_fee_min: number } | null;
  const bps = fee?.fee_override_bps ?? plan?.application_fee_bps ?? 0;
  const fixed = fee?.fee_override_fixed ?? plan?.application_fee_fixed ?? 0;
  const status = connectStatus(account);
  const configured = stripeConfigured();
  const tone = { none: "neutral", pending: "amber", active: "green" } as const;
  const label = { none: t.payments.statusNone, pending: t.payments.statusPending, active: t.payments.statusActive };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {error ? <Notice tone="error">{t.payments.errors[error]}</Notice> : null}
      {sp.connected ? <Notice tone="success">{t.payments.connected}</Notice> : null}
      {!configured ? <Notice>{t.payments.notConfigured}</Notice> : null}

      <Card title="Stripe" actions={<Badge tone={tone[status]}>{label[status]}</Badge>}>
        {status === "none" ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-muted">{t.payments.connectHint}</p>
            <form action={connectStripe}>
              <button type="submit" className={buttonClass.primary} disabled={!configured} data-testid="connect-stripe">
                {t.payments.connect}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {status === "pending" ? <Notice>{t.payments.pendingHint}</Notice> : null}
            {account && !account.livemode ? <Notice>{t.payments.testMode}</Notice> : null}
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              <dt className="text-muted">{t.payments.account}</dt>
              <dd className="font-medium">
                {account?.business_name ?? account?.account_id} {account?.country ? `· ${account.country}` : ""}
              </dd>
              <dt className="text-muted">{t.payments.charges}</dt>
              <dd>{account?.charges_enabled ? t.payments.on : t.payments.off}</dd>
              <dt className="text-muted">{t.payments.payouts}</dt>
              <dd>{account?.payouts_enabled ? t.payments.on : t.payments.off}</dd>
              {Array.isArray(account?.requirements) && account.requirements.length ? (
                <>
                  <dt className="text-muted">Stripe</dt>
                  <dd>{fmt(t.payments.openItems, { count: account.requirements.length })}</dd>
                </>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              <a href={stripeDashboardUrl(Boolean(account?.livemode))} target="_blank" rel="noreferrer" className={buttonClass.secondary}>
                {t.payments.openStripe} <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
              <form action={refreshStripe}>
                <button type="submit" className={buttonClass.ghost}>
                  {t.payments.refresh}
                </button>
              </form>
              {roleAtLeast(tenant.role, "owner") ? <DisconnectButton /> : null}
            </div>
          </div>
        )}
      </Card>

      <Card title={t.payments.fee}>
        <p className="text-sm">
          {bps || fixed
            ? fmt(fixed ? t.payments.feeValue : t.payments.feeValueRate, { percent: (bps / 100).toLocaleString(locale === "de" ? "de-CH" : "en-CH"), fixed: formatMoney(fixed, fee?.currency ?? "CHF", locale) }) +
              (plan?.application_fee_min ? `, ${fmt(t.common.feeMin, { amount: formatMoney(plan.application_fee_min, fee?.currency ?? "CHF", locale) })}` : "")
            : t.payments.feeNone}
        </p>
      </Card>
    </div>
  );
}
