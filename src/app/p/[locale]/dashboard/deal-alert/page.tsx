import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, Notice, PageHeader, Skeleton, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { createAdminClient } from "@/lib/supabase/admin";
import { dealStatus, formatMoney } from "@/lib/shop/deal-status";
import { nextSlot, scheduleFromRow } from "@/lib/alerts/schedule";
import { ScheduleForm } from "./schedule-form";
import { ManualComposer } from "./composer";
import { AlertSwitch, RemoveButton } from "./controls";

export const metadata = { title: "Deal-Alarm" };
const PAGE = 50;

export default async function DealAlertPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/deal-alert">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.dealAlertAdmin.title} description={t.dealAlertAdmin.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Alert t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Alert({ t, locale, searchParams }: { t: Dictionary; locale: string; searchParams: PageProps<"/p/[locale]/dashboard/deal-alert">["searchParams"] }) {
  const { tenant, supabase } = await requireTenant("admin");
  const a = t.dealAlertAdmin;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const preselect = typeof sp.deal === "string" ? sp.deal : null;
  const admin = createAdminClient();
  const [{ data: allowed }, { data: info }, list, { count: active }, { data: history }, { data: payments }, { data: live }, { data: auto }, { data: byHand }, { data: settings }] = await Promise.all([
    admin.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "deal_alert" }),
    supabase.from("tenants").select("deal_alert_at, currency").eq("id", tenant.id).single(),
    supabase.from("deal_alert_subscribers").select("id, email, status, created_at", { count: "exact" }).eq("tenant_id", tenant.id).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from("deal_alert_subscribers").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("status", "confirmed"),
    supabase.rpc("deal_alert_history", { p_tenant: tenant.id }),
    admin.from("stripe_accounts").select("charges_enabled").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("deals").select("id, title, state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free, price_cents, alert_skip, partners(name), deal_images(url, sort_order)").eq("tenant_id", tenant.id).eq("state", "published").is("archived_at", null).order("published_at", { ascending: false }),
    supabase.from("deal_alerts").select("deal_id, created_at").eq("tenant_id", tenant.id).eq("kind", "auto"),
    supabase.from("deal_alert_deals").select("deal_id, deal_alerts(created_at)").eq("tenant_id", tenant.id),
    supabase.from("deal_alert_settings").select("mode, window_from, window_to, weekdays, send_at").eq("tenant_id", tenant.id).maybeSingle(),
  ]);
  const on = Boolean(info?.deal_alert_at);
  const date = (iso: string) => new Date(iso).toLocaleString(locale === "de" ? "de-CH" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Zurich" });
  const schedule = scheduleFromRow(settings);
  const next = nextSlot(schedule, new Date());
  const total = list.count ?? 0;
  // When each deal last went out, by itself or by hand.
  const lastSent = new Map<string, string>();
  for (const [id, at] of [...(auto ?? []).map((x) => [x.deal_id, x.created_at] as const), ...(byHand ?? []).map((x) => [x.deal_id, x.deal_alerts?.created_at] as const)])
    if (id && at && at > (lastSent.get(id) ?? "")) lastSent.set(id, at);
  const deals = (live ?? [])
    .filter((d) => dealStatus(d) === "live")
    .map((d) => ({
      id: d.id,
      title: d.title,
      partner: d.partners?.name ?? "",
      price: formatMoney(d.price_cents, info?.currency ?? "CHF", locale),
      image: [...d.deal_images].sort((x, y) => x.sort_order - y.sort_order)[0]?.url ?? null,
      sentAt: lastSent.has(d.id) ? date(lastSent.get(d.id)!) : null,
      skipped: d.alert_skip,
    }));
  return (
    <div className="flex flex-col gap-6">
      {allowed !== true ? (
        <Notice tone="warning">
          {a.notOnPlan}{" "}
          <Link href="/dashboard/billing" className="font-semibold underline">{a.toPlans}</Link>
        </Notice>
      ) : null}
      {allowed === true && on && !payments?.charges_enabled ? <Notice tone="warning">{a.needsPayments}</Notice> : null}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${on && allowed ? "bg-success" : "bg-line"}`} />
              {on && allowed ? a.isOn : a.isOff}
            </p>
            <p className="mt-0.5 text-sm text-muted">{on && allowed ? (next ? fmt(a.onHints.scheduled, { date: date(next.toISOString()) }) : a.onHints[schedule.mode === "manual" ? "manual" : "instant"]) : a.offHint}</p>
          </div>
          {allowed === true || on ? <AlertSwitch on={on} /> : null}
        </div>
      </Card>

      {allowed === true ? (
        <div id="automatic" className="scroll-mt-24">
          <Card title={a.auto.title} description={a.auto.intro}>
            <ScheduleForm initial={schedule} />
          </Card>
        </div>
      ) : null}

      <div id="manual" className="scroll-mt-24">
        <Card title={a.manual.title} description={a.manual.intro}>
          {on && allowed === true && payments?.charges_enabled ? <ManualComposer key={preselect ?? ""} deals={deals} recipients={active ?? 0} preselect={preselect} /> : <p className="text-sm text-muted">{a.manual.errors.off}</p>}
        </Card>
      </div>

      <Card
        title={fmt(a.subscribers, { count: active ?? 0 })}
        description={a.subscribersHint}
        actions={total ? <a href="/api/dashboard/export?kind=deal-alert" className={buttonClass.secondary}>{a.export}</a> : undefined}
      >
        {list.data?.length ? (
          <div className="-mx-5 -mb-5">
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>{a.email}</th>
                  <th className={thClass}>{a.status}</th>
                  <th className={`${thClass} hidden sm:table-cell`}>{a.since}</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {list.data.map((s) => (
                  <tr key={s.id} data-testid="alert-subscriber">
                    <td className={`${tdClass} break-all font-medium`}>{s.email}</td>
                    <td className={tdClass}><Badge tone={s.status === "confirmed" ? "green" : "amber"}>{s.status === "confirmed" ? a.confirmed : a.pending}</Badge></td>
                    <td className={`${tdClass} hidden text-muted sm:table-cell`}>{date(s.created_at)}</td>
                    <td className={`${tdClass} text-right`}><RemoveButton id={s.id} email={s.email} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {total > PAGE ? (
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                {page > 1 ? <Link href={`/dashboard/deal-alert?page=${page - 1}`} className="font-semibold">← {a.newer}</Link> : <span />}
                {page * PAGE < total ? <Link href={`/dashboard/deal-alert?page=${page + 1}`} className="font-semibold">{a.older} →</Link> : <span />}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">{a.noSubscribers}</p>
        )}
      </Card>

      <Card title={a.history} description={a.historyHint}>
        {history?.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="min-w-0">
                  {h.deal_id ? <Link href={`/dashboard/deals/${h.deal_id}`} className="font-semibold hover:underline">{h.title}</Link> : <span className="font-semibold">{h.title}</span>}
                  <span className="block text-xs text-muted">{date(h.created_at)} · {h.kind === "manual" ? a.byHand : h.kind === "digest" ? a.collected : a.automatic}</span>
                </span>
                <span className="text-muted">
                  {fmt(a.sentOf, { sent: h.sent, total: h.recipients })}
                  {h.open ? ` · ${fmt(a.openCount, { count: h.open })}` : ""}
                  {h.failed ? ` · ${fmt(a.failedCount, { count: h.failed })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{a.noHistory}</p>
        )}
      </Card>
    </div>
  );
}
