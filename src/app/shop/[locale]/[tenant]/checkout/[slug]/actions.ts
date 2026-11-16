"use server";

import { headers } from "next/headers";
import { requestOrigin } from "@/lib/auth/session";
import { RESERVATION_MINUTES, SESSION_MINUTES, checkoutError, checkoutInput, stripeBranding, type CheckoutError } from "@/lib/payments/map";
import { getStripe, publishableKey, stripeConfigured } from "@/lib/payments/stripe";
import { createRateLimiter } from "@/lib/rate-limit";
import { getShopProfile } from "@/lib/shop/queries";
import { classifyHost } from "@/lib/site/hosts";
import { resolveShop } from "@/lib/site/resolve-shop";
import { createAdminClient } from "@/lib/supabase/admin";

export type StartResult =
  | { ok: true; clientSecret: string; account: string; publishableKey: string; expiresAt: string; orderNumber: string }
  | { ok: false; error: CheckoutError };

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

/**
 * Buyer clicked "continue to payment": reserve the quantity (start_checkout locks the deal, so no
 * overselling), then open a Stripe Checkout session on the shop's own Stripe account with
 * Sellycat's application fee. If Stripe fails, the reservation is released right away.
 */
export async function startCheckout(tenantId: string, slug: string, raw: unknown): Promise<StartResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!limiter.check(`${ip}:${tenantId}`).ok) return { ok: false, error: "rate" };
  const parsed = checkoutInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.some((i) => i.path[0] === "email") ? "email" : "quantity" };
  const input = parsed.data;
  if (!stripeConfigured()) return { ok: false, error: "payments" };

  // The form must be posted from this shop's own host; the return URL is built from it.
  const host = classifyHost(h.get("x-forwarded-host") ?? h.get("host"));
  const shop = host.kind === "apex" ? null : await resolveShop(host);
  if (!shop || shop.id !== tenantId) return { ok: false, error: "unavailable" };

  const admin = createAdminClient();
  const [{ data: account }, { data: deal }, profile] = await Promise.all([
    admin.from("stripe_accounts").select("account_id, charges_enabled").eq("tenant_id", tenantId).maybeSingle(),
    admin.from("deals").select("id").eq("tenant_id", tenantId).eq("slug", slug).maybeSingle(),
    getShopProfile(tenantId),
  ]);
  if (!account?.charges_enabled) return { ok: false, error: "payments" };
  if (!deal) return { ok: false, error: "unavailable" };

  const { data: rows, error } = await admin.rpc("start_checkout", {
    p_deal: deal.id,
    p_qty: input.qty,
    p_email: input.email,
    p_name: input.name,
    p_newsletter: input.newsletter,
    p_locale: shop.locale,
    p_minutes: RESERVATION_MINUTES,
  });
  const order = rows?.[0];
  if (error || !order) return { ok: false, error: checkoutError(error?.message) };

  try {
    const origin = await requestOrigin();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        ui_mode: "embedded_page",
        mode: "payment",
        line_items: [{ quantity: input.qty, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.unit_cents, product_data: { name: order.title } } }],
        customer_email: input.email,
        client_reference_id: order.order_id,
        metadata: { order_id: order.order_id, tenant_id: tenantId, order_number: order.order_number },
        payment_intent_data: {
          ...(order.fee_cents > 0 ? { application_fee_amount: order.fee_cents } : {}),
          description: `${shop.name} · ${order.order_number}`,
          metadata: { order_id: order.order_id, tenant_id: tenantId, order_number: order.order_number },
        },
        locale: shop.locale === "en" ? "en" : "de",
        ...(profile ? { branding_settings: stripeBranding(profile.theme) } : {}),
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
        return_url: `${origin}/order/${order.order_id}?session_id={CHECKOUT_SESSION_ID}`,
      },
      { stripeAccount: account.account_id, idempotencyKey: `checkout-${order.order_id}` },
    );
    await admin.from("orders").update({ stripe_session_id: session.id, stripe_account_id: account.account_id }).eq("id", order.order_id);
    if (!session.client_secret) throw new Error("no client secret");
    return { ok: true, clientSecret: session.client_secret, account: account.account_id, publishableKey: publishableKey()!, expiresAt: order.expires_at, orderNumber: order.order_number };
  } catch (e) {
    console.error(`[checkout] order ${order.order_id}:`, e instanceof Error ? e.message : e);
    await admin.rpc("release_order", { p_order: order.order_id });
    return { ok: false, error: "failed" };
  }
}
