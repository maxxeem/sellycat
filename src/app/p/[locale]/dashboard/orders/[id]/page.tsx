import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { Badge, Card, Notice, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { roleAtLeast } from "@/lib/auth/tenants";
import { requireTenant } from "@/lib/dashboard/context";
import { ORDER_TONE, dateTime } from "@/lib/dashboard/order-ui";
import { refundable, stripeDashboardUrl } from "@/lib/payments/map";
import { formatMoney } from "@/lib/shop/deal-status";
import { RefundForm } from "./refund-form";
import { ResendButton } from "./resend-button";

export const metadata = { title: "Order" };

export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

export default async function OrderPage({ params }: PageProps<"/p/[locale]/dashboard/orders/[id]">) {
  const { t, locale } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Order t={t} locale={locale} id={params.then((p) => p.id)} />
    </Suspense>
  );
}

async function Order({ t, locale, id: idPromise }: { t: Dictionary; locale: string; id: Promise<string> }) {
  const id = await idPromise;
  const { tenant, supabase } = await requireTenant("editor");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data: order }, { data: account }, { data: mails }] = await Promise.all([
    supabase.from("orders").select("*, order_items(id, title, qty, unit_cents, total_cents, deal_id), buyers(newsletter_opt_in_at)").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("stripe_accounts").select("livemode").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("mail_log").select("id, kind, recipient, status, error, created_at").eq("order_id", id).eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!order) notFound();
  const money = (c: number) => formatMoney(c, order.currency, locale);
  const canRefund = roleAtLeast(tenant.role, "admin") && (order.status === "paid" || order.status === "partially_refunded") && refundable(order) > 0;
  const paid = order.status === "paid" || order.status === "partially_refunded";
  const day = (d: string) => new Date(d).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
  const buyer = order.buyers as unknown as { newsletter_opt_in_at: string | null } | null;

  return (
    <>
      <PageHeader
        title={`${t.orders.number} ${order.number}`}
        actions={
          <Link href="/dashboard/orders" className={buttonClass.ghost}>
            ← {t.orders.back}
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {order.oversold ? <Notice>{t.orders.oversold}</Notice> : null}
          <Card title={t.orders.items} actions={<Badge tone={ORDER_TONE[order.status]}>{t.orders.status[order.status]}</Badge>}>
            <ul className="flex flex-col divide-y divide-line">
              {order.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2">
                  <span>
                    {i.qty} × {i.deal_id ? <Link href={`/dashboard/deals/${i.deal_id}`} className="hover:underline">{i.title}</Link> : i.title}
                  </span>
                  <span className="font-semibold">{money(i.total_cents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-4 text-sm">
              <dt className="font-semibold">{t.orders.amount}</dt>
              <dd className="text-right font-semibold">{money(order.amount_cents)}</dd>
              <dt className="text-muted">{t.orders.fee}</dt>
              <dd className="text-right text-muted">− {money(order.fee_cents)}</dd>
              {order.refunded_cents ? (
                <>
                  <dt className="text-muted">{t.orders.refunded}</dt>
                  <dd className="text-right text-muted">− {money(order.refunded_cents)}</dd>
                </>
              ) : null}
            </dl>
          </Card>
          <Card title={t.orders.mails}>
            {mails?.length ? (
              <ul className="flex flex-col divide-y divide-line text-sm">
                {mails.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{t.orders.mailKind[m.kind as "order" | "gift" | "my_link"] ?? m.kind}</span>
                      <span className="block truncate text-muted">{m.recipient}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted">{dateTime(m.created_at, locale)}</span>
                      <Badge tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "neutral"}>{t.orders.mailStatus[m.status as "sent" | "failed" | "skipped"] ?? m.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t.orders.noMails}</p>
            )}
            {paid ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <ResendButton orderId={order.id} kind="order" email={order.email} />
                {order.gift && order.gift_email ? <ResendButton orderId={order.id} kind="gift" email={order.gift_email} /> : null}
              </div>
            ) : null}
          </Card>
          {canRefund ? (
            <Card title={t.orders.refund}>
              <RefundForm orderId={order.id} maxCents={refundable(order)} currency={order.currency} />
            </Card>
          ) : null}
        </div>
        <Card title={t.orders.customer}>
          <dl className="flex flex-col gap-1 text-sm">
            {order.name ? <dd className="font-semibold">{order.name}</dd> : null}
            <dd>
              <a href={`mailto:${order.email}`} className="hover:underline">
                {order.email}
              </a>
            </dd>
            {buyer?.newsletter_opt_in_at ? <dd className="text-muted">{t.orders.newsletter}</dd> : null}
            {order.gift && order.gift_email ? (
              <>
                <dt className="mt-3 text-muted">🎁 {t.orders.gift}</dt>
                {order.gift_name ? <dd className="font-semibold">{order.gift_name}</dd> : null}
                <dd>{order.gift_email}</dd>
                <dd className="text-muted">
                  {order.gift_sent_at ? fmt(t.orders.giftSent, { date: day(order.gift_sent_at) }) : order.gift_send_on ? fmt(t.orders.giftOn, { date: day(`${order.gift_send_on}T12:00:00Z`) }) : t.orders.giftNow}
                </dd>
                {order.gift_message ? <dd className="mt-1 whitespace-pre-line italic">“{order.gift_message}”</dd> : null}
              </>
            ) : null}
            <dt className="mt-3 text-muted">{t.orders.date}</dt>
            <dd>{dateTime(order.created_at, locale)}</dd>
            {order.paid_at ? (
              <>
                <dt className="mt-3 text-muted">{t.orders.paidAt}</dt>
                <dd>{dateTime(order.paid_at, locale)}</dd>
              </>
            ) : null}
          </dl>
          {order.stripe_payment_intent ? (
            <a href={stripeDashboardUrl(Boolean(account?.livemode), `/payments/${order.stripe_payment_intent}`)} target="_blank" rel="noreferrer" className={`${buttonClass.secondary} mt-4 w-full`}>
              {t.orders.openInStripe} <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </Card>
      </div>
    </>
  );
}
