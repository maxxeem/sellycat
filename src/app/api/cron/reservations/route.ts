import { NextResponse } from "next/server";
import { reconcileExpired } from "@/lib/payments/orders";
import { stripeConfigured } from "@/lib/payments/stripe";

/**
 * Safety net for checkouts whose Stripe events never arrived: expired reservations are checked
 * against Stripe and then fulfilled or released. Vercel Cron calls it with `CRON_SECRET`.
 * Normally Stripe's `checkout.session.expired` and the next checkout of the same deal free the stock
 * much earlier.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ ok: true, skipped: "stripe not configured" });
  return NextResponse.json({ ok: true, ...(await reconcileExpired()) });
}
