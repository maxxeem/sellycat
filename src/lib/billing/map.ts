/** Pure billing helpers (tested): Stripe mode, ids per mode, subscription → shop state. */
import type { Interval } from "./plans";

export type BillingStatus = "none" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
export type StripeMode = "test" | "live";
/** Ids of one plan in one Stripe mode (product, monthly and yearly price). */
export type PlanStripeIds = { product_id?: string; price_month_id?: string; price_year_id?: string };

/** Test and live products/prices are separate objects in Stripe: the key decides which set applies. */
export const stripeModeFor = (secretKey: string | undefined): StripeMode => (secretKey?.startsWith("sk_live_") ? "live" : "test");

/** The ids stored for one mode (tolerates null, strings and other junk in the jsonb column). */
export function idsForMode<T extends object>(stored: unknown, mode: StripeMode): T {
  const byMode = stored && typeof stored === "object" ? (stored as Partial<Record<StripeMode, T>>) : {};
  const ids = byMode[mode];
  return (ids && typeof ids === "object" ? ids : {}) as T;
}

/** Which plan and interval a Stripe price belongs to. */
export function planForPrice(priceId: string, plans: Array<{ id: string; stripe: PlanStripeIds }>): { planId: string; interval: Interval } | null {
  for (const p of plans) {
    if (p.stripe.price_month_id === priceId) return { planId: p.id, interval: "monthly" };
    if (p.stripe.price_year_id === priceId) return { planId: p.id, interval: "yearly" };
  }
  return null;
}

export function mapSubscriptionStatus(status: string): BillingStatus {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "unpaid":
      return status;
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

export type TenantBillingState = {
  plan_id: string;
  billing_status: BillingStatus;
  billing_interval: Interval | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

/** Shop fields from a subscription snapshot. Cancelled or unpaid → Free. Null if no plan price is on it. */
export function tenantStateFromSubscription(input: {
  status: string;
  priceIds: string[];
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  plans: Array<{ id: string; stripe: PlanStripeIds }>;
  freePlanId?: string;
}): TenantBillingState | null {
  const billing = mapSubscriptionStatus(input.status);
  const plan = input.priceIds.map((id) => planForPrice(id, input.plans)).find(Boolean);
  if (!plan) return null;
  const gone = billing === "canceled" || billing === "unpaid";
  return {
    plan_id: gone ? (input.freePlanId ?? "free") : plan.planId,
    billing_status: billing,
    billing_interval: gone ? null : plan.interval,
    current_period_end: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000).toISOString() : null,
    cancel_at_period_end: input.cancelAtPeriodEnd,
  };
}

/** Upgrade (now, prorated) or downgrade (at the period end): by plan order, then yearly → monthly. */
export function isDowngrade(order: string[], from: { planId: string; interval: Interval | null }, to: { planId: string; interval: Interval }): boolean {
  const rank = (id: string) => order.indexOf(id);
  return rank(to.planId) < rank(from.planId) || (to.planId === from.planId && from.interval === "yearly" && to.interval === "monthly");
}
