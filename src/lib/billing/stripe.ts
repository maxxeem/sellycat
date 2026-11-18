import "server-only";
import type Stripe from "stripe";
import { getStripe, stripeConfigured, stripeLivemode } from "@/lib/payments/stripe";
import { cleanSecret } from "@/lib/payments/map";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { currencyFromStripe, type Currency, CURRENCIES } from "./currency";
import { idsForMode, type PlanStripeIds, type StripeMode } from "./map";
import { toPlan, type Interval, type Plan } from "./plans";

/**
 * Sellycat's own subscriptions (Stripe Billing on the platform account, the same key as Connect).
 * Plans are edited by staff; `syncPlan` keeps Stripe's products and prices in line (prices are
 * immutable: a changed amount becomes a new price, the old one is archived).
 */
export { stripeConfigured };
export const billingMode = (): StripeMode => (stripeLivemode() ? "live" : "test");
export const billingWebhookSecret = () => cleanSecret(process.env.STRIPE_BILLING_WEBHOOK_SECRET);
/** Stripe Tax (automatic VAT) only once it is set up in the Stripe account. */
export const stripeTaxEnabled = () => process.env.STRIPE_TAX === "1";

export type PlanWithStripe = Plan & { stripe: PlanStripeIds; stripeRaw: unknown };

export async function loadPlans(): Promise<PlanWithStripe[]> {
  const { data } = await createAdminClient()
    .from("plans")
    .select("id, name, sort_order, is_public, contact_only, limits, prices, marketing, application_fee_bps, application_fee_fixed, trial_days, stripe")
    .order("sort_order");
  const mode = billingMode();
  return (data ?? []).map((row) => ({ ...toPlan(row), stripe: idsForMode<PlanStripeIds>(row.stripe, mode), stripeRaw: row.stripe }));
}

/** Stripe customer of a shop (created on first use, id stored on the tenant). */
export async function ensureCustomer(tenant: { id: string; name: string; stripe_customer_id: string | null }, email: string): Promise<string> {
  if (tenant.stripe_customer_id) return tenant.stripe_customer_id;
  const customer = await getStripe().customers.create({ name: tenant.name, email, metadata: { tenant_id: tenant.id } });
  await createAdminClient().from("tenants").update({ stripe_customer_id: customer.id }).eq("id", tenant.id);
  return customer.id;
}

/** The currency Stripe has locked for a customer (after the first subscription), null before. */
export async function customerCurrency(customerId: string | null): Promise<Currency | null> {
  if (!customerId || !stripeConfigured()) return null;
  try {
    const c = await getStripe().customers.retrieve(customerId);
    return c.deleted ? null : currencyFromStripe(c.currency);
  } catch {
    return null;
  }
}

const cents = (v: number) => Math.round(v * 100);

/** CHF is the base currency of every price; EUR and USD ride along as currency_options. */
function priceShape(plan: Plan, interval: Interval): { unit: number; options: Stripe.PriceCreateParams.CurrencyOptions & Record<string, { unit_amount: number; tax_behavior: "inclusive" }> } | null {
  const p = plan.prices[interval];
  if (!p.CHF || p.CHF <= 0) return null;
  const options: Record<string, { unit_amount: number; tax_behavior: "inclusive" }> = {};
  for (const c of CURRENCIES) if (c !== "CHF" && (p[c] ?? 0) > 0) options[c.toLowerCase()] = { unit_amount: cents(p[c]!), tax_behavior: "inclusive" };
  return { unit: cents(p.CHF), options };
}

function sameOptions(current: Stripe.Price, wanted: Record<string, { unit_amount: number }>): boolean {
  const have = current.currency_options ?? {};
  const keys = new Set([...Object.keys(wanted), ...Object.keys(have).filter((k) => k !== "chf")]);
  for (const k of keys) if (have[k]?.unit_amount !== wanted[k]?.unit_amount) return false;
  return true;
}

/**
 * Brings one plan's Stripe product and prices in line with the database and stores the ids
 * (per mode). Free and contact-only plans get no prices. Returns the ids or an error message.
 */
export async function syncPlan(planId: string): Promise<{ ok: true; ids: PlanStripeIds } | { ok: false; error: string }> {
  if (!stripeConfigured()) return { ok: false, error: "Stripe ist nicht eingerichtet." };
  const plan = (await loadPlans()).find((p) => p.id === planId);
  if (!plan) return { ok: false, error: "Plan nicht gefunden." };
  const stripe = getStripe();
  const mode = billingMode();
  try {
    const ids: PlanStripeIds = { ...plan.stripe };
    const needsPrices = !plan.contactOnly && (priceShape(plan, "monthly") || priceShape(plan, "yearly"));
    if (needsPrices) {
      const stored: Stripe.Product | null = ids.product_id ? await stripe.products.retrieve(ids.product_id).catch(() => null) : null;
      let product: Stripe.Product;
      if (!stored || stored.deleted || !stored.active) {
        const found = await stripe.products.search({ query: `metadata['plan_id']:'${plan.id}' AND active:'true'` });
        product = found.data[0] ?? (await stripe.products.create({ name: `Sellycat ${plan.name}`, metadata: { plan_id: plan.id }, statement_descriptor: "SELLYCAT" }));
      } else {
        product = stored;
        if (product.name !== `Sellycat ${plan.name}`) await stripe.products.update(product.id, { name: `Sellycat ${plan.name}` });
      }
      ids.product_id = product.id;
    }
    for (const interval of ["monthly", "yearly"] as const) {
      const key = interval === "monthly" ? "price_month_id" : "price_year_id";
      const lookup = `sellycat_${plan.id}_${interval}`;
      const shape = plan.contactOnly ? null : priceShape(plan, interval);
      const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1, expand: ["data.currency_options"] });
      const current = existing.data[0];
      if (!shape) {
        if (current) await stripe.prices.update(current.id, { active: false });
        delete ids[key];
        continue;
      }
      if (current && current.unit_amount === shape.unit && current.product === ids.product_id && sameOptions(current, shape.options)) {
        ids[key] = current.id;
        continue;
      }
      const created = await stripe.prices.create({
        product: ids.product_id!,
        currency: "chf",
        unit_amount: shape.unit,
        tax_behavior: "inclusive",
        currency_options: shape.options,
        recurring: { interval: interval === "monthly" ? "month" : "year" },
        lookup_key: lookup,
        transfer_lookup_key: true,
        metadata: { plan_id: plan.id, interval },
      });
      if (current) await stripe.prices.update(current.id, { active: false });
      ids[key] = created.id;
    }
    const stored = { ...(plan.stripeRaw && typeof plan.stripeRaw === "object" ? (plan.stripeRaw as Record<string, unknown>) : {}), [mode]: ids };
    await createAdminClient().from("plans").update({ stripe: stored as Json }).eq("id", plan.id);
    return { ok: true, ids };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe-Fehler" };
  }
}

/** Customer portal: invoices, payment method, cancel at period end (plan changes stay in Sellycat). */
export async function portalConfiguration(): Promise<string | undefined> {
  const admin = createAdminClient();
  const mode = billingMode();
  const { data } = await admin.from("platform_settings").select("billing").eq("id", true).maybeSingle();
  const billing = data?.billing && typeof data.billing === "object" ? (data.billing as Record<string, Record<string, string>>) : {};
  const existing = billing[mode]?.portal_configuration_id;
  if (existing) return existing;
  try {
    const config = await getStripe().billingPortal.configurations.create({
      business_profile: { headline: "Sellycat" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["address", "name", "tax_id", "email"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
    await admin.from("platform_settings").update({ billing: { ...billing, [mode]: { ...(billing[mode] ?? {}), portal_configuration_id: config.id } } as Json }).eq("id", true);
    return config.id;
  } catch {
    return undefined;
  }
}
