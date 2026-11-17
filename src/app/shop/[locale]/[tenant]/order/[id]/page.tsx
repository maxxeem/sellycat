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
import { VoucherCard } from "@/components/shop/voucher-card";
import { VoucherActions } from "@/components/shop/wallet-buttons";
import { getDictionary } from "@/lib/i18n";
import { walletAvailable } from "@/lib/wallet/passes";
import { checkUrl } from "@/lib/vouchers/symbol";
import { headers } from "next/headers";

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
  const load = () => admin.from("orders").select("id, number, status, email, currency, amount_cents, stripe_session_id, stripe_account_id, gift, gift_email, gift_send_on, gift_sent_at, order_items(title, qty, total_cents)").eq("id", id).eq("tenant_id", tenant).maybeSingle();
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
  const { data: vouchers } = paid
    ? await admin.from("vouchers").select("id, title, code, code_format, barcode_type, status, valid_until, value_cents, remaining_cents, token, partners(name)").eq("order_id", order.id).order("created_at")
    : { data: [] };
  const host = shop.primaryHost ?? (await headers()).get("host") ?? "";
  const wallet = walletAvailable();
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
        {paid && order.gift && order.gift_email ? (
          <p className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-3 text-sm" data-testid="gift-note">
            🎁{" "}
            {order.gift_sent_at || !order.gift_send_on
              ? fmt(t.giftSentTo, { email: order.gift_email })
              : fmt(t.giftScheduled, {
                  email: order.gift_email,
                  date: new Date(`${order.gift_send_on}T12:00:00Z`).toLocaleDateString(shop.locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" }),
                })}
          </p>
        ) : null}
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
      {vouchers?.length ? (
        <section className="mt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="shop-heading text-xl font-bold">{t.yourVouchers}</h2>
            {vouchers.length > 1 ? (
              <a href={`/order/${order.id}/pdf?session_id=${encodeURIComponent(sessionId)}`} target="_blank" rel="noopener" className="text-sm font-semibold underline underline-offset-2" data-testid="order-pdf">
                {getDictionary(shop.locale).wallet.allPdf}
              </a>
            ) : null}
          </div>
          {vouchers.map((v) => (
            <VoucherCard
              key={v.id}
              t={t}
              locale={shop.locale}
              currency={order.currency}
              v={{
                title: v.title,
                code: v.code,
                codeFormat: v.code_format,
                barcodeType: v.barcode_type,
                status: v.status,
                validUntil: v.valid_until,
                valueCents: v.value_cents,
                remainingCents: v.remaining_cents,
                partner: v.partners?.name ?? null,
                link: checkUrl(host, v.token),
              }}
              actions={<VoucherActions token={v.token} t={getDictionary(shop.locale).wallet} available={wallet} status={v.status} />}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
