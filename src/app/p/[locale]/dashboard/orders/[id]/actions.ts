"use server";

import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { refundable } from "@/lib/payments/map";
import { getStripe, stripeConfigured } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export type RefundState = { ok?: boolean; error?: "invalid" | "stripe"; message?: string } | null;

/**
 * Refund (owner/admin): through Stripe on the shop's own account, Sellycat's fee proportionally
 * back to the shop. A full refund can put the quantity back on sale.
 */
export async function refundOrder(orderId: string, _: RefundState, form: FormData): Promise<RefundState> {
  const { tenant } = await requireTenant("admin");
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, status, amount_cents, refunded_cents, stripe_payment_intent, stripe_account_id").eq("id", orderId).eq("tenant_id", tenant.id).maybeSingle();
  if (!order || !order.stripe_payment_intent || !order.stripe_account_id || !["paid", "partially_refunded"].includes(order.status)) return { error: "invalid" };
  const amount = Math.round(Number(String(form.get("amount") ?? "").replace(",", ".")) * 100);
  const max = refundable(order);
  if (!Number.isInteger(amount) || amount < 1 || amount > max) return { error: "invalid" };
  if (!stripeConfigured()) return { error: "stripe", message: "Stripe is not configured" };
  try {
    await getStripe().refunds.create(
      { payment_intent: order.stripe_payment_intent, amount, refund_application_fee: true, metadata: { order_id: order.id } },
      { stripeAccount: order.stripe_account_id, idempotencyKey: `refund-${order.id}-${order.refunded_cents}-${amount}` },
    );
  } catch (e) {
    return { error: "stripe", message: e instanceof Error ? e.message : String(e) };
  }
  await admin.rpc("record_refund", { p_payment_intent: order.stripe_payment_intent, p_refunded: order.refunded_cents + amount });
  if (amount === max && form.get("restock") === "on") await admin.rpc("restock_order", { p_order: order.id });
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/orders", "layout");
  return { ok: true };
}
