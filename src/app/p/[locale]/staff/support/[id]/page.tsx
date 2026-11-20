import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { STATUS_TONE, isSupportCategory, isSupportStatus } from "@/lib/support/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { TicketTools } from "../panels";

export const metadata = { title: "Support" };

export default function StaffTicketPage({ params }: PageProps<"/p/[locale]/staff/support/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TicketLoader params={params} />
    </Suspense>
  );
}

async function TicketLoader({ params }: { params: PageProps<"/p/[locale]/staff/support/[id]">["params"] }) {
  const { t } = await fromParams(params);
  return <Ticket t={t} id={params.then((p) => p.id)} />;
}

async function Ticket({ t, id }: { t: Dictionary; id: Promise<string> }) {
  await requireStaff();
  const ticketId = await id;
  if (!/^[0-9a-f-]{36}$/.test(ticketId)) notFound();
  const admin = createAdminClient();
  const { data: tk } = await admin.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!tk) notFound();
  const { data: messages } = await admin.from("support_messages").select("id, author, body, attachment_path, attachment_name, created_at").eq("ticket_id", tk.id).order("created_at");
  const s = t.staff.support;
  const when = (iso: string) => new Date(iso).toLocaleString("de-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/support" className="text-muted hover:text-ink">← {s.title}</Link>
      </p>
      <PageHeader
        title={`#${tk.number} · ${tk.subject}`}
        description={`${isSupportCategory(tk.category) ? t.support.categories[tk.category] : tk.category} · ${when(tk.created_at)} · ${tk.locale.toUpperCase()}`}
        actions={isSupportStatus(tk.status) ? <Badge tone={STATUS_TONE[tk.status]}>{t.support.statuses[tk.status]}</Badge> : null}
      />
      <Card title={s.contact} className="mb-6">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted">{s.cols.from}</dt><dd>{tk.user_name ?? "–"} · <a href={`mailto:${tk.user_email}`} className="hover:underline">{tk.user_email}</a></dd></div>
          <div>
            <dt className="text-xs text-muted">{s.cols.shop}</dt>
            <dd>
              {tk.tenant_name ?? "–"} · {tk.plan_id ?? "–"}
              {tk.tenant_id ? <Link href={`/admin/tenants/${tk.tenant_id}`} className="ml-2 text-xs text-accent-text hover:underline">{s.openShop}</Link> : null}
            </dd>
          </div>
        </dl>
      </Card>
      <Card title={s.thread} className="mb-6">
        <ol className="flex flex-col gap-3">
          {(messages ?? []).map((m) => (
            <li key={m.id} className={`rounded-xl border px-4 py-3 text-sm ${m.author === "staff" ? "border-accent/40 bg-accent/5" : "border-line bg-surface"}`}>
              <p className="mb-1 text-xs text-muted">{m.author === "staff" ? "Sellycat" : tk.user_name || tk.user_email} · {when(m.created_at)}</p>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              {m.attachment_path ? (
                <a href={`/api/support/attachment/${m.attachment_path}`} target="_blank" rel="noopener" className="mt-2 inline-block text-xs font-medium text-accent-text underline">
                  📎 {m.attachment_name ?? "Anhang"}
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>
      <Card title={s.answer}>
        <TicketTools ticketId={tk.id} status={tk.status} note={tk.internal_note ?? ""} />
      </Card>
    </>
  );
}
