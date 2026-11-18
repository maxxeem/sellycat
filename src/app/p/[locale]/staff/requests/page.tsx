import { Suspense } from "react";
import { EmptyState, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { DoneButton } from "./done-button";

export default async function RequestsPage({ params }: PageProps<"/p/[locale]/staff/requests">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.requests.title} description={t.staff.requests.intro} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Requests t={t} />
      </Suspense>
    </>
  );
}

async function Requests({ t }: { t: Dictionary }) {
  await requireStaff();
  const { data } = await createAdminClient().from("contact_requests").select("*").order("created_at", { ascending: false }).limit(300);
  const r = t.staff.requests;
  if (!data?.length) return <EmptyState title={r.empty} />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={thClass}>{r.when}</th>
          <th className={thClass}>{r.from}</th>
          <th className={thClass}>{r.plan}</th>
          <th className={thClass}>{r.message}</th>
          <th className={thClass} />
        </tr>
      </thead>
      <tbody>
        {data.map((q) => (
          <tr key={q.id} className={q.handled_at ? "opacity-50" : ""}>
            <td className={`${tdClass} whitespace-nowrap text-sm`}>{new Date(q.created_at).toLocaleString("de-CH", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" })}</td>
            <td className={`${tdClass} text-sm`}>
              <span className="font-semibold">{q.name}</span>
              {q.company ? <span className="block text-muted">{q.company}</span> : null}
              <a href={`mailto:${q.email}`} className="block text-accent-text">
                {q.email}
              </a>
              <span className="text-xs text-muted">{[q.country, q.locale].filter(Boolean).join(" · ")}</span>
            </td>
            <td className={`${tdClass} text-sm`}>{q.plan_id ?? "–"}</td>
            <td className={`${tdClass} max-w-md whitespace-pre-wrap text-sm`}>{q.message}</td>
            <td className={tdClass}>{q.handled_at ? r.done : <DoneButton id={q.id} label={r.markDone} />}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
