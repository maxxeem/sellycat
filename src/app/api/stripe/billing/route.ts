import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { applySubscription, tenantIdFor } from "@/lib/billing/apply";
import { billingWebhookSecret, stripeConfigured } from "@/lib/billing/stripe";
import { getStripe } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { sendSubscriptionMail } from "@/lib/mail/onboarding";

/**
 * Stripe Billing webhook (events of the platform account itself, not of connected accounts):
 * signature check, idempotent per event id (`billing_events`), then the shop's plan and billing
 * state follow the subscription. Subscribe to: checkout.session.completed,
 * customer.subscription.created|updated|deleted, invoice.paid, invoice.payment_failed.
 */
export async function POST(request: Request) {
  const secret = billingWebhookSecret();
  if (!stripeConfigured() || !secret) return NextResponse.json({ error: "Stripe Billing is not configured." }, { status: 503 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : "?"}` }, { status: 400 });
  }
  // Connect events (from shops' own accounts) go to /api/stripe/webhook, never here.
  if (event.account) return NextResponse.json({ ok: true, ignored: "connect" });

  const admin = createAdminClient();
  const { data: seen } = await admin.from("billing_events").select("status").eq("id", event.id).maybeSingle();
  if (seen && seen.status !== "failed") return NextResponse.json({ ok: true, duplicate: true });

  let tenantId: string | null = null;
  let status: "ok" | "ignored" | "failed" = "ignored";
  let error: string | null = null;
  try {
    tenantId = await handle(event);
    status = tenantId ? "ok" : "ignored";
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
    console.error(`[billing webhook] ${event.type} ${event.id}: ${error}`);
  }
  await admin.from("billing_events").upsert({ id: event.id, type: event.type, status, tenant_id: tenantId, payload: event.data.object as unknown as Json, error });
  return NextResponse.json({ ok: status !== "failed" }, { status: status === "failed" ? 500 : 200 });
}

async function handle(event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return null;
      const sub = await getStripe().subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
      const tenantId = await applySubscription(sub);
      // A newly booked plan: thank-you mail once the response is out.
      if (tenantId) after(() => sendSubscriptionMail(tenantId).catch((e) => console.error("[subscription mail]", e instanceof Error ? e.message : e)));
      return tenantId;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return applySubscription(event.data.object);
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subId = invoice.parent?.subscription_details?.subscription;
      if (subId) return applySubscription(await getStripe().subscriptions.retrieve(typeof subId === "string" ? subId : subId.id));
      return tenantIdFor(invoice.customer, invoice.parent?.subscription_details?.metadata ?? null);
    }
    default:
      return null;
  }
}
