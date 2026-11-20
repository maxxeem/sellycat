import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, Notice, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { billingLines } from "@/lib/settlements/billing";
import { periodText } from "@/lib/settlements/period";
import { loadSettlement } from "@/lib/settlements/settlements";
import { formatMoney } from "@/lib/shop/deal-status";
import { SettlementActions } from "../controls";

export const metadata = { title: "Abrechnung" };

const TONE = { draft: "amber", final: "coral", paid: "green" } as const;

export default function SettlementPage({ params }: PageProps<"/p/[locale]/dashboard/settlements/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <SettlementLoader params={params} />
    </Suspense>
  );
}

async function SettlementLoader({ params }: { params: PageProps<"/p/[locale]/dashboard/settlements/[id]">["params"] }) {
  const { t, locale } = await fromParams(params);
  return <Settlement t={t} locale={locale} id={params.then((p) => p.id)} />;
}

async function Settlement({ t, locale, id }: { t: Dictionary; locale: "de" | "en"; id: Promise<string> }) {
  const { tenant } = await requireTenant("admin");
  const found = await loadSettlement(tenant.id, await id);
  if (!found) notFound();
  const { s: x, lines } = found;
  const s = t.settlements;
  const money = (c: number) => formatMoney(c, x.currency, locale);
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { timeZone: "Europe/Zurich" });
  const billing = x.partner.billing ?? {};
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/dashboard/settlements" className="text-muted hover:text-ink">← {s.back}</Link>
      </p>
      <PageHeader
        title={`${x.number ? `${s.pdfTitle} ${x.number}` : s.draft} · ${x.partner.name ?? ""}`}
        description={periodText(x.period_from, x.period_to, locale)}
        actions={<Badge tone={TONE[x.status]}>{s[x.status]}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <SettlementActions id={x.id} status={x.status} email={x.partner.email ?? null} />
          {x.status === "draft" ? <p className="mt-4 text-sm text-muted">{s.draftHint}</p> : null}
          {x.sent_at ? <p className="mt-4 text-sm text-muted">{fmt(s.sentAt, { date: day(x.sent_at) })}</p> : null}
        </Card>
        <Card title={s.payTo}>
          <div className="text-sm">
            {billingLines(x.partner.name ?? "", billing).map((l, i) => (
              <p key={i} className={i === 0 ? "font-semibold" : "text-muted"}>{l}</p>
            ))}
            {billing.iban ? <p className="mt-2 font-mono">{billing.iban}</p> : <Notice tone="warning">{s.noIban}</Notice>}
            {!x.partner.email ? <div className="mt-2"><Notice tone="warning">{s.noEmail}</Notice></div> : <p className="mt-2 text-muted">{x.partner.email}</p>}
            <p className="mt-3 text-2xl font-bold tabular-nums">{money(x.payout_cents)}</p>
          </div>
        </Card>
      </div>
      <Card className="mt-6" title={`${s.lines} (${lines.length})`}>
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th className={thClass}>{s.date}</th>
                <th className={thClass}>{s.deal}</th>
                <th className={`${thClass} hidden sm:table-cell`}>{s.code}</th>
                <th className={thClass}>{s.kind}</th>
                <th className={`${thClass} hidden text-right md:table-cell`}>{s.base}</th>
                <th className={`${thClass} hidden text-right md:table-cell`}>{s.commission}</th>
                <th className={`${thClass} text-right`}>{s.payout}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className={`${tdClass} whitespace-nowrap text-sm`}>{day(l.occurred_at)}</td>
                  <td className={tdClass}>{l.deal_title}</td>
                  <td className={`${tdClass} hidden font-mono text-sm sm:table-cell`}>{l.code}</td>
                  <td className={`${tdClass} text-sm ${l.kind === "correction" ? "text-danger" : ""}`}>{s.kinds[l.kind]}</td>
                  <td className={`${tdClass} hidden text-right tabular-nums md:table-cell`}>{money(l.base_cents)}</td>
                  <td className={`${tdClass} hidden text-right tabular-nums md:table-cell`}>{money(l.commission_cents)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{money(l.payout_cents)}</td>
                </tr>
              ))}
              <tr>
                <td className={`${tdClass} font-semibold`} colSpan={4}>{s.total}</td>
                <td className={`${tdClass} hidden text-right font-semibold tabular-nums md:table-cell`}>{money(x.base_cents)}</td>
                <td className={`${tdClass} hidden text-right font-semibold tabular-nums md:table-cell`}>{money(x.commission_cents)}</td>
                <td className={`${tdClass} text-right font-semibold tabular-nums`}>{money(x.payout_cents)}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}
