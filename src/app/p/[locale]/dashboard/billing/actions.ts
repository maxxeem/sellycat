"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { applySubscription } from "@/lib/billing/apply";
import { currencyForCountry, type Currency } from "@/lib/billing/currency";
import { currencyFromRequest } from "@/lib/billing/currency-server";
import { isDowngrade } from "@/lib/billing/map";
import type { Interval } from "@/lib/billing/plans";
import { customerCurrency, ensureCustomer, loadPlans, portalConfiguration, stripeConfigured, stripeTaxEnabled } from "@/lib/billing/stripe";
import { requireTenant } from "@/lib/dashboard/context";
import { getStripe } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export type BillingError = "config" | "plan" | "same" | "contact" | "ended" | "stripe" | "noSchedule";
export type BillingResult = { ok: true } | { ok: false; error: BillingError; detail?: string };

async function base(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

/** Owner/admin of the current shop, with the billing fields. */
async function billingContext() {
  const { tenant, user } = await requireTenant("admin");
  const { data } = await createAdminClient()
    .from("tenants")
    .select("id, name, locale, plan_id, billing, billing_status, billing_interval, stripe_customer_id, stripe_subscription_id, stripe_schedule_id")
    .eq("id", tenant.id)
    .single();
  return { tenant: data!, email: user.email ?? "" };
}

/** Locked by Stripe after the first subscription, else the billing country, else the location. */
async function resolveCurrency(customerId: string | null, billing: unknown): Promise<Currency> {
  const locked = await customerCurrency(customerId);
  if (locked) return locked;
  const country = billing && typeof billing === "object" ? (billing as Record<string, unknown>).country : null;
  return typeof country === "string" && country ? currencyForCountry(country) : currencyFromRequest();
}

function stripeError(e: unknown): BillingResult {
  console.error("[billing]", e instanceof Error ? e.message : e);
  return { ok: false, error: "stripe", detail: e instanceof Error ? e.message : undefined };
}

/**
 * Books or changes a plan. Without a subscription: Stripe Checkout (with the plan's trial the
 * first time). With one: an upgrade switches now (prorated, invoiced right away), a downgrade is
 * scheduled for the end of the paid period (as in SwypeCast). Contact-only plans are never sold here.
 */
export async function choosePlan(planId: string, interval: Interval): Promise<BillingResult> {
  if (!stripeConfigured()) return { ok: false, error: "config" };
  const { tenant, email } = await billingContext();
  const plans = await loadPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return { ok: false, error: "plan" };
  if (plan.contactOnly) return { ok: false, error: "contact" };
  const price = interval === "yearly" ? plan.stripe.price_year_id : plan.stripe.price_month_id;
  if (!price) return { ok: false, error: "plan" };

  if (tenant.stripe_subscription_id) {
    const order = plans.map((p) => p.id);
    const down = isDowngrade(order, { planId: tenant.plan_id, interval: (tenant.billing_interval as Interval | null) ?? null }, { planId, interval });
    const r = down ? await scheduleDowngrade(tenant.id, tenant.stripe_subscription_id, price, planId, interval) : await changeNow(tenant.id, tenant.stripe_subscription_id, price, planId, plans);
    if (!r.ok) return r;
    redirect(`/dashboard/billing?checkout=${down ? "scheduled" : "changed"}`);
  }

  let session: Stripe.Checkout.Session;
  try {
    const customer = await ensureCustomer(tenant, email);
    const currency = await resolveCurrency(customer, tenant.billing);
    const firstTime = tenant.billing_status === "none";
    const url = await base();
    session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: tenant.id,
      currency: currency.toLowerCase(),
      line_items: [{ price, quantity: 1 }],
      success_url: `${url}/dashboard/billing?checkout=success`,
      cancel_url: `${url}/dashboard/billing?checkout=cancel`,
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      ...(stripeTaxEnabled() ? { automatic_tax: { enabled: true }, tax_id_collection: { enabled: true } } : {}),
      locale: tenant.locale === "en" ? "en" : "de",
      allow_promotion_codes: true,
      metadata: { tenant_id: tenant.id, plan_id: planId },
      subscription_data: { metadata: { tenant_id: tenant.id, plan_id: planId }, ...(firstTime && plan.trialDays > 0 ? { trial_period_days: plan.trialDays } : {}) },
    });
  } catch (e) {
    return stripeError(e);
  }
  if (!session.url) return { ok: false, error: "stripe" };
  redirect(session.url);
}

/** Upgrade: on the running subscription now, prorated and invoiced right away. */
async function changeNow(tenantId: string, subscriptionId: string, price: string, planId: string, plans: Awaited<ReturnType<typeof loadPlans>>): Promise<BillingResult> {
  const stripe = getStripe();
  try {
    let sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status === "canceled") return { ok: false, error: "ended" };
    if (sub.schedule) {
      await stripe.subscriptionSchedules.release(typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id);
      await clearPending(tenantId);
      sub = await stripe.subscriptions.retrieve(subscriptionId);
    }
    const planPrices = plans.flatMap((p) => [p.stripe.price_month_id, p.stripe.price_year_id]).filter(Boolean);
    const item = sub.items.data.find((i) => planPrices.includes(i.price.id)) ?? sub.items.data[0];
    if (!item) return { ok: false, error: "plan" };
    if (item.price.id === price) return { ok: false, error: "same" };
    const intervalChanges = item.price.recurring?.interval !== (await stripe.prices.retrieve(price)).recurring?.interval;
    const params: Stripe.SubscriptionUpdateParams = {
      items: [{ id: item.id, price, quantity: 1 }],
      proration_behavior: "always_invoice",
      cancel_at_period_end: false,
      metadata: { ...sub.metadata, tenant_id: tenantId, plan_id: planId },
    };
    // A new interval starts a new period today; the unused rest of the old one is credited.
    if (intervalChanges) params.billing_cycle_anchor = { type: "now" };
    const updated = await stripe.subscriptions.update(sub.id, params);
    await applySubscription(updated);
    return { ok: true };
  } catch (e) {
    return stripeError(e);
  }
}

/** Downgrade at the end of the paid period (subscription schedule); nothing is charged now. */
async function scheduleDowngrade(tenantId: string, subscriptionId: string, price: string, planId: string, interval: Interval): Promise<BillingResult> {
  const stripe = getStripe();
  try {
    let sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status === "canceled") return { ok: false, error: "ended" };
    if (sub.schedule) {
      await stripe.subscriptionSchedules.release(typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id);
      sub = await stripe.subscriptions.retrieve(subscriptionId);
    }
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: sub.id });
    const current = schedule.phases[0];
    if (!current) return { ok: false, error: "stripe" };
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        { start_date: current.start_date, end_date: current.end_date, items: current.items.map((i) => ({ price: typeof i.price === "string" ? i.price : i.price.id, quantity: i.quantity ?? undefined })) },
        { items: [{ price, quantity: 1 }], duration: { interval: interval === "yearly" ? "year" : "month", interval_count: 1 }, metadata: { tenant_id: tenantId, plan_id: planId } },
      ],
    });
    const { error } = await createAdminClient()
      .from("tenants")
      .update({ stripe_schedule_id: schedule.id, pending_plan_id: planId, pending_interval: interval, pending_at: new Date(current.end_date * 1000).toISOString(), cancel_at_period_end: false })
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return stripeError(e);
  }
}

async function clearPending(tenantId: string) {
  await createAdminClient().from("tenants").update({ stripe_schedule_id: null, pending_plan_id: null, pending_interval: null, pending_at: null }).eq("id", tenantId);
}

/** «Behalten»: the scheduled downgrade is dropped, the current plan continues. */
export async function keepPlan(): Promise<BillingResult> {
  if (!stripeConfigured()) return { ok: false, error: "config" };
  const { tenant } = await billingContext();
  if (!tenant.stripe_schedule_id) return { ok: false, error: "noSchedule" };
  try {
    const schedule = await getStripe().subscriptionSchedules.retrieve(tenant.stripe_schedule_id);
    if (schedule.status === "active" || schedule.status === "not_started") await getStripe().subscriptionSchedules.release(schedule.id);
  } catch (e) {
    return stripeError(e);
  }
  await clearPending(tenant.id);
  return { ok: true };
}

/** Stripe customer portal: invoices, payment method, address, cancellation at period end. */
export async function openPortal(): Promise<BillingResult> {
  if (!stripeConfigured()) return { ok: false, error: "config" };
  const { tenant, email } = await billingContext();
  let url: string;
  try {
    const customer = await ensureCustomer(tenant, email);
    const configuration = await portalConfiguration();
    url = (await getStripe().billingPortal.sessions.create({ customer, return_url: `${await base()}/dashboard/billing`, locale: tenant.locale === "en" ? "en" : "de", ...(configuration ? { configuration } : {}) })).url;
  } catch (e) {
    return stripeError(e);
  }
  redirect(url);
}
