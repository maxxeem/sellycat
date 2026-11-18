import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantStateFromSubscription } from "./map";
import { loadPlans } from "./stripe";

/** The shop behind a Stripe customer: metadata first, then the stored customer id. */
export async function tenantIdFor(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, metadata?: Stripe.Metadata | null): Promise<string | null> {
  if (metadata?.tenant_id) return metadata.tenant_id;
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return null;
  const { data } = await createAdminClient().from("tenants").select("id").eq("stripe_customer_id", id).maybeSingle();
  return data?.id ?? null;
}

/**
 * Writes a subscription's state onto the shop (plan, interval, period, status). Shared by the
 * webhook and the dashboard actions, so the dashboard shows the change right away.
 */
export async function applySubscription(sub: Stripe.Subscription): Promise<string | null> {
  const tenantId = await tenantIdFor(sub.customer, sub.metadata);
  if (!tenantId) return null;
  const plans = await loadPlans();
  const state = tenantStateFromSubscription({
    status: sub.status,
    priceIds: sub.items.data.map((i) => i.price.id),
    currentPeriodEnd: sub.items.data[0]?.current_period_end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    plans,
    freePlanId: plans.find((p) => p.id === "free")?.id ?? plans[0]?.id,
  });
  if (!state) throw new Error(`no plan price on subscription ${sub.id}`);
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("pending_plan_id, pending_interval").eq("id", tenantId).maybeSingle();
  // A scheduled downgrade that has landed (or lost its schedule) is no longer pending.
  const landed = tenant?.pending_plan_id && (!sub.schedule || (tenant.pending_plan_id === state.plan_id && tenant.pending_interval === state.billing_interval));
  const ended = sub.status === "canceled";
  const { error } = await admin
    .from("tenants")
    .update({
      ...state,
      stripe_subscription_id: ended ? null : sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      ...(landed || ended ? { stripe_schedule_id: null, pending_plan_id: null, pending_interval: null, pending_at: null } : {}),
    })
    .eq("id", tenantId);
  if (error) throw new Error(error.message);
  return tenantId;
}
