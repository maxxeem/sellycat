import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { STATUS_TONE, isSupportCategory, isSupportStatus } from "@/lib/support/rules";
import { loadTicket } from "@/lib/support/support";
import { ReplyForm } from "../forms";

export const metadata = { title: "Support" };

export default async function TicketPage({ params }: PageProps<"/p/[locale]/dashboard/support/[id]">) {
  const { t, locale } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Ticket t={t} locale={locale} id={params.then((p) => p.id)} />
    </Suspense>
  );
}

/** One request: the thread with our replies and a reply box. RLS decides who may open it. */
async function Ticket({ t, locale, id }: { t: Dictionary; locale: string; id: Promise<string> }) {
  await requireTenant("redeemer");
  const found = await loadTicket(await id);
  if (!found) notFound();
  const { ticket, messages } = found;
  const s = t.support;
  const when = (iso: string) => new Date(iso).toLocaleString(locale === "de" ? "de-CH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/dashboard/support" className="text-muted hover:text-ink">← {s.back}</Link>
      </p>
      <PageHeader
        title={`#${ticket.number} · ${ticket.subject}`}
        description={`${isSupportCategory(ticket.category) ? s.categories[ticket.category] : ticket.category} · ${when(ticket.created_at)}`}
        actions={isSupportStatus(ticket.status) ? <Badge tone={STATUS_TONE[ticket.status]}>{s.statuses[ticket.status]}</Badge> : null}
      />
      <ol className="flex flex-col gap-3">
        {messages.map((m) => (
          <li key={m.id} className={`rounded-2xl border px-5 py-4 text-sm ${m.author === "staff" ? "border-accent/40 bg-accent/5" : "border-line bg-surface"}`}>
            <p className="mb-1.5 text-xs text-muted">
              <span className="font-semibold text-ink">{m.author === "staff" ? s.fromTeam : ticket.user_name || ticket.user_email}</span> · {when(m.created_at)}
            </p>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
            {m.attachment_path ? (
              <a href={`/api/support/attachment/${m.attachment_path}`} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-medium text-accent-text underline underline-offset-2">
                📎 {m.attachment_name ?? "Anhang"}
              </a>
            ) : null}
          </li>
        ))}
      </ol>
      <Card className="mt-6" title={s.reply}>
        <ReplyForm ticketId={ticket.id} />
      </Card>
    </>
  );
}
