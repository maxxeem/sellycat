import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import { dayIn } from "@/lib/analytics/metrics";
import { requireTenant } from "@/lib/dashboard/context";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { formatMoney } from "@/lib/shop/deal-status";
import { isDay, lastMonthEnd, periodText } from "@/lib/settlements/period";
import { listSettlements, openAmounts } from "@/lib/settlements/settlements";
import { CreateButton } from "./controls";

export const metadata = { title: "Abrechnungen" };

const STATUS_TONE = { draft: "amber", final: "coral", paid: "green" } as const;

export default async function SettlementsPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/settlements">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.settlements.title} description={t.settlements.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Settlements t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Settlements({ t, locale, searchParams }: { t: Dictionary; locale: "de" | "en"; searchParams: PageProps<"/p/[locale]/dashboard/settlements">["searchParams"] }) {
  const { tenant, supabase } = await requireTenant("admin");
  const sp = await searchParams;
  const { data: shop } = await supabase.from("tenants").select("timezone, currency").eq("id", tenant.id).single();
  const today = dayIn(new Date(), shop?.timezone ?? "Europe/Zurich");
  const until = isDay(sp.until) && sp.until <= today ? sp.until : lastMonthEnd(today);
  const [open, list] = await Promise.all([openAmounts(tenant.id, until), listSettlements(tenant.id)]);
  const s = t.settlements;
  const currency = shop?.currency ?? "CHF";
  const money = (c: number, cur = currency) => formatMoney(c, cur, locale);
  const dateText = new Date(`${until}T00:00:00Z`).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="flex flex-col gap-6">
      <Card
        title={s.open}
        description={fmt(s.openIntro, { date: dateText })}
        actions={
          <form method="get" className="flex items-center gap-2">
            <label className="text-sm text-muted" htmlFor="until">{s.until}</label>
            <input id="until" type="date" name="until" defaultValue={until} max={today} className="rounded-input border border-line bg-surface-2 px-2 py-1 text-sm" />
            <button type="submit" className={buttonGhost}>OK</button>
          </form>
        }
      >
        {open.length ? (
          <div className="flex flex-col gap-4">
            <div className="-mx-5 overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th className={thClass}>{s.partner}</th>
                    <th className={`${thClass} text-right`}>{s.lines}</th>
                    <th className={`${thClass} hidden text-right sm:table-cell`}>{s.base}</th>
                    <th className={`${thClass} hidden text-right sm:table-cell`}>{s.commission}</th>
                    <th className={`${thClass} text-right`}>{s.payout}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody>
                  {open.map((o) => (
                    <tr key={o.partner_id}>
                      <td className={`${tdClass} font-medium`}>{o.partner_name}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{o.lines}</td>
                      <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{money(o.base_cents)}</td>
                      <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{money(o.commission_cents)}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{money(o.payout_cents)}</td>
                      <td className={`${tdClass} text-right`}>
                        <CreateButton until={until} partnerId={o.partner_id} label={o.has_draft ? s.recreate : s.create} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <CreateButton until={until} label={s.createAll} primary />
          </div>
        ) : (
          <p className="text-sm text-muted">{s.nothingOpen}</p>
        )}
      </Card>

      <Card title={s.list}>
        {list.length ? (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>{s.number}</th>
                  <th className={thClass}>{s.partner}</th>
                  <th className={`${thClass} hidden md:table-cell`}>{s.period}</th>
                  <th className={`${thClass} text-right`}>{s.payout}</th>
                  <th className={thClass}>{s.status}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td className={`${tdClass} tabular-nums text-muted`}>{x.number ?? "–"}</td>
                    <td className={tdClass}>
                      <Link href={`/dashboard/settlements/${x.id}`} className="font-medium hover:underline">{x.partner.name ?? "–"}</Link>
                    </td>
                    <td className={`${tdClass} hidden text-sm text-muted md:table-cell`}>{periodText(x.period_from, x.period_to, locale)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{money(x.payout_cents, x.currency)}</td>
                    <td className={tdClass}><Badge tone={STATUS_TONE[x.status]}>{s[x.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted">{s.none}</p>
        )}
      </Card>
    </div>
  );
}

const buttonGhost = "rounded-input border border-line px-3 py-1 text-sm font-medium hover:bg-surface-2";
