import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui";
import { feePercent, formatPrice } from "@/lib/billing/plans";
import { loadPlans } from "@/lib/billing/stripe";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanEditor } from "./plan-editor";

export default async function PlansPage({ params }: PageProps<"/p/[locale]/staff/plans">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.plans.title} description={t.staff.plans.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Plans t={t} />
      </Suspense>
    </>
  );
}

async function Plans({ t }: { t: Dictionary }) {
  const staff = await requireStaff();
  const [plans, { data: tenants }] = await Promise.all([loadPlans(), createAdminClient().from("tenants").select("plan_id")]);
  const count = (id: string) => (tenants ?? []).filter((r) => r.plan_id === id).length;
  const p = t.staff.plans;
  return (
    <div className="flex flex-col gap-6">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          title={plan.name}
          description={[
            `ID ${plan.id}`,
            fmt(p.shops, { count: count(plan.id) }),
            plan.contactOnly ? p.contactOnly : plan.prices.monthly.CHF !== undefined ? `${formatPrice(plan.prices.monthly.CHF, "CHF")} ${p.perMonth}` : null,
            `${p.fee} ${feePercent(plan.feeBps)}`,
            plan.stripe.price_month_id || plan.stripe.price_year_id ? p.inStripe : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <PlanEditor plan={plan} canEdit={staff.role === "superadmin"} />
        </Card>
      ))}
    </div>
  );
}
