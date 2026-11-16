import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { shopTexts } from "@/components/shop/shop-texts";
import { fmt } from "@/lib/i18n";
import { completeSession } from "@/lib/payments/orders";
import { getStripe, stripeConfigured } from "@/lib/payments/stripe";
import { formatMoney } from "@/lib/shop/deal-status";
import { getShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

/**
 * Return page after Stripe. Shown only with the matching `session_id` (Stripe adds it to the
 * return URL). If the webhook has not arrived yet, the session is checked with Stripe directly,
 * so the buyer sees "paid" right away.
 */
export default function OrderPage({ params, searchParams }: PageProps<"/shop/[locale]/[tenant]/order/[id]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Order params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f-]{36}$/;

async function Order({ params, searchParams }: Pick<PageProps<"/shop/[locale]/[tenant]/order/[id]">, "params" | "searchParams">) {
  const [{ tenant, id }, sp] = await Promise.all([params, searchParams]);
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (!UUID.test(id) || !sessionId) notFound();
  const shop = await getShopProfile(tenant);
  if (!shop) notFound();
  const admin = createAdminClient();
  const load = () => admin.from("orders").select("id, number, status, email, currency, amount_cents, stripe_session_id, stripe_account_id, order_items(title, qty, total_cents)").eq("id", id).eq("tenant_id", tenant).maybeSingle();
  let { data: order } = await load();
  if (!order || order.stripe_session_id !== sessionId) notFound();

  if (order.status === "pending" && order.stripe_account_id && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: order.stripe_account_id });
      if (session.status === "complete" && (await completeSession(session, { refresh: false }))) order = (await load()).data ?? order;
    } catch (e) {
      console.error(`[order] ${id}:`, e instanceof Error ? e.message : e);
    }
  }

  const t = shopTexts(shop.locale);
  const money = (c: number) => formatMoney(c, order.currency, shop.locale);
  const paid = order.status === "paid" || order.status === "partially_refunded";
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <title>{`${fmt(t.orderNumber, { number: order.number })} · ${shop.name}`}</title>
      <meta name="robots" content="noindex" />
      {order.status === "pending" ? <meta httpEquiv="refresh" content="4" /> : null}
      <div className="shop-card flex flex-col gap-4 p-6 sm:p-8" data-status={order.status}>
        <p className="text-sm text-[var(--shop-muted)]">{fmt(t.orderNumber, { number: order.number })}</p>
        <h1 className="shop-heading text-2xl font-bold">
          {paid ? t.thanks : order.status === "pending" ? t.processing : order.status === "refunded" ? t.orderRefunded : t.orderExpired}
        </h1>
        {paid ? <p>{fmt(t.vouchersByMail, { email: order.email })}</p> : null}
        <ul className="flex flex-col gap-2 border-t border-[var(--shop-line)] pt-4">
          {order.order_items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4">
              <span>
                {i.qty} × {i.title}
              </span>
              <span className="font-semibold">{money(i.total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-[var(--shop-line)] pt-4 font-bold">
          <span>{t.total}</span>
          <span>{money(order.amount_cents)}</span>
        </div>
        <Link href="/" className="shop-btn mt-2 w-full">
          {t.continueShopping}
        </Link>
      </div>
    </div>
  );
}
