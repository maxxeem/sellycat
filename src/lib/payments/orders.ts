import "server-only";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletUpdate } from "@/lib/wallet/passes";
import { deliverOrder } from "@/lib/mail/deliver";
import { kickWebhooks } from "@/lib/developers/webhooks";
import { accountState } from "./map";
import { getStripe } from "./stripe";

/**
 * Order state transitions shared by the webhook, the return page and the cleanup cron. All of them
 * are idempotent, so the same Stripe event may arrive through several paths in any order.
 */

/** Stock and "only X left" changed: the shop refreshes on the next visit. */
function refreshShopCache(tenantId: string | null | undefined) {
  if (tenantId) revalidateTag(`shop:${tenantId}`, "max");
}

/** A completed Checkout session: paid → order paid, stock sold. Async methods wait for their own event. */
/** `refresh: false` while rendering a page (cache tags can only be revalidated in actions and route handlers). */
export async function completeSession(session: Pick<Stripe.Checkout.Session, "id" | "payment_status" | "payment_intent">, { refresh = true } = {}): Promise<string | null> {
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return null;
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const admin = createAdminClient();
  const { data: orderId, error } = await admin.rpc("fulfil_order", { p_session: session.id, p_payment_intent: pi ?? "" });
  if (error) throw new Error(`fulfil_order ${session.id}: ${error.message}`);
  if (!orderId) return null;
  const { data: order } = await admin.from("orders").select("tenant_id").eq("id", orderId).maybeSingle();
  if (refresh) refreshShopCache(order?.tenant_id);
  // Voucher mail with PDF (and the gift mail when due) after the response; claimed, so never twice.
  after(() => deliverOrder(orderId).catch((e) => console.error(`[mail] order ${orderId}:`, e instanceof Error ? e.message : e)));
  kickWebhooks(order?.tenant_id);
  return order?.tenant_id ?? null;
}

/** An expired or failed session: the reservation gives its stock back. */
export async function releaseSession(sessionId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, tenant_id").eq("stripe_session_id", sessionId).maybeSingle();
  if (!order) return null;
  const { error } = await admin.rpc("release_order", { p_order: order.id });
  if (error) throw new Error(`release_order ${order.id}: ${error.message}`);
  refreshShopCache(order.tenant_id);
  return order.tenant_id;
}

/** Refund state from a charge (absolute amount, so repeated events are harmless). */
export async function recordRefund(charge: Pick<Stripe.Charge, "payment_intent" | "amount_refunded">): Promise<string | null> {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent?.id ?? null);
  if (!pi) return null;
  const admin = createAdminClient();
  const { data: orderId, error } = await admin.rpc("record_refund", { p_payment_intent: pi, p_refunded: charge.amount_refunded });
  if (error) throw new Error(`record_refund ${pi}: ${error.message}`);
  if (!orderId) return null;
  const { data: order } = await admin.from("orders").select("tenant_id").eq("id", orderId).maybeSingle();
  // Refunded vouchers also change in Apple and Google Wallet.
  const { data: vouchers } = await admin.from("vouchers").select("id").eq("order_id", orderId);
  after(() => walletUpdate((vouchers ?? []).map((v) => v.id)));
  kickWebhooks(order?.tenant_id);
  return order?.tenant_id ?? null;
}

/** Stripe account → `stripe_accounts` row (status, open requirements); refreshes the shop when "can sell" changes. */
export async function syncAccount(account: Stripe.Account): Promise<string | null> {
  const admin = createAdminClient();
  // One Stripe account may serve several shops: all of them get the new state.
  const { data: rows } = await admin.from("stripe_accounts").select("tenant_id, charges_enabled").eq("account_id", account.id);
  if (!rows?.length) return null;
  const state = accountState(account);
  await admin.from("stripe_accounts").update(state).eq("account_id", account.id);
  for (const row of rows) if (row.charges_enabled !== state.charges_enabled) refreshShopCache(row.tenant_id);
  return rows[0].tenant_id;
}

/** The customer revoked Sellycat's access in their Stripe dashboard. */
export async function disconnectAccount(accountId: string): Promise<string | null> {
  const admin = createAdminClient();
  // Access revoked at Stripe: every shop on this account loses it.
  const { data: rows } = await admin.from("stripe_accounts").delete().eq("account_id", accountId).select("tenant_id");
  for (const row of rows ?? []) refreshShopCache(row.tenant_id);
  return rows?.[0]?.tenant_id ?? null;
}

/**
 * Safety net for missed webhooks: pending orders whose reservation ran out are checked against
 * Stripe. Paid → fulfilled; still open → session expired first, so it cannot be paid any more;
 * then the stock goes back.
 */
export async function reconcileExpired(limit = 200): Promise<{ fulfilled: number; released: number; failed: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("reservations")
    .select("order_id, orders!inner(id, status, stripe_session_id, stripe_account_id)")
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .limit(limit);
  const result = { fulfilled: 0, released: 0, failed: 0 };
  const seen = new Set<string>();
  for (const r of rows ?? []) {
    const order = r.orders as unknown as { id: string; status: string; stripe_session_id: string | null; stripe_account_id: string | null };
    if (seen.has(order.id) || order.status !== "pending") continue;
    seen.add(order.id);
    try {
      if (order.stripe_session_id && order.stripe_account_id) {
        const stripe = getStripe();
        const opts = { stripeAccount: order.stripe_account_id };
        const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {}, opts);
        if (session.status === "complete" && (await completeSession(session))) {
          result.fulfilled++;
          continue;
        }
        if (session.status === "open") await stripe.checkout.sessions.expire(session.id, {}, opts);
      }
      await admin.rpc("release_order", { p_order: order.id });
      result.released++;
    } catch (e) {
      result.failed++;
      console.error(`[reconcile] order ${order.id}:`, e instanceof Error ? e.message : e);
    }
  }
  return result;
}
