import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { STATUS_TONE, isSupportCategory, isSupportStatus } from "@/lib/support/rules";
import { listTickets, supportRequester } from "@/lib/support/support";
import { NewTicketForm } from "./forms";

export const metadata = { title: "Support" };

export default async function SupportPage({ params }: PageProps<"/p/[locale]/dashboard/support">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.support.title} description={t.support.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Support t={t} locale={locale} />
      </Suspense>
    </>
  );
}

async function Support({ t, locale }: { t: Dictionary; locale: string }) {
  await requireTenant("redeemer");
  const req = await supportRequester();
  if (!req) return null;
  const tickets = await listTickets(req);
  const s = t.support;
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        {s.helpFirst}{" "}
        <Link href="/help" className="font-medium text-accent-text hover:underline">{s.helpLink} →</Link>
      </p>
      <Card title={s.newTitle} description={fmt(s.sentAs, { name: req.name || req.email, shop: req.tenantName })}>
        <NewTicketForm />
      </Card>
      <Card title={req.canSeeAll ? s.yoursAll : s.yours}>
        {tickets.length ? (
          <ul className="-mx-5 -my-5 divide-y divide-line">
            {tickets.map((tk) => (
              <li key={tk.id}>
                <Link href={`/dashboard/support/${tk.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <span className="w-12 shrink-0 text-xs tabular-nums text-muted">#{tk.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{tk.subject}</span>
                    <span className="block truncate text-xs text-muted">
                      {isSupportCategory(tk.category) ? s.categories[tk.category] : tk.category}
                      {req.canSeeAll ? ` · ${fmt(s.from, { name: tk.user_name || tk.user_email })}` : ""}
                    </span>
                  </span>
                  {isSupportStatus(tk.status) ? <Badge tone={STATUS_TONE[tk.status]}>{s.statuses[tk.status]}</Badge> : null}
                  <span className="hidden w-24 text-right text-xs text-muted sm:block">{date(tk.last_message_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{s.none}</p>
        )}
      </Card>
    </div>
  );
}
