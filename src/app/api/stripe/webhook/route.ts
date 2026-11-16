import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { completeSession, disconnectAccount, recordRefund, releaseSession, syncAccount } from "@/lib/payments/orders";
import { connectWebhookSecret, getStripe, stripeConfigured } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe Connect webhook ("events on connected accounts"): signature check, idempotent per event
 * id (`processed_events`), then orders and accounts follow Stripe. Subscribe to:
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired, charge.refunded,
 * account.updated, account.application.deauthorized.
 */
export async function POST(request: Request) {
  const secret = connectWebhookSecret();
  if (!stripeConfigured() || !secret) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : "?"}` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from("processed_events").select("status").eq("id", event.id).maybeSingle();
  // A failed event is retried by Stripe and handled again; ok/ignored ones are done.
  if (seen && seen.status !== "failed") return NextResponse.json({ ok: true, duplicate: true });

  let status: "ok" | "ignored" | "failed" = "ignored";
  let error: string | null = null;
  try {
    status = (await handle(event)) ? "ok" : "ignored";
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
    console.error(`[stripe webhook] ${event.type} ${event.id}: ${error}`);
  }
  await admin.from("processed_events").upsert({ id: event.id, type: event.type, account: event.account ?? null, status, error });
  return NextResponse.json({ ok: status !== "failed" }, { status: status === "failed" ? 500 : 200 });
}

async function handle(event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return completeSession(event.data.object);
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return releaseSession(event.data.object.id);
    case "charge.refunded":
      return recordRefund(event.data.object);
    case "account.updated":
      return syncAccount(event.data.object);
    case "account.application.deauthorized":
      return event.account ? disconnectAccount(event.account) : null;
    default:
      return null;
  }
}
