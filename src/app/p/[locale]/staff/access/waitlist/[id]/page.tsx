import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Badge, Card, Skeleton, linkClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_TONE } from "../shared";
import { InviteForm } from "../waitlist-table";
import { NoteForm, StatusSelect } from "./entry-forms";

export default async function EntryPage({ params }: PageProps<"/p/[locale]/staff/access/waitlist/[id]">) {
  const { t, locale } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Entry t={t} locale={locale} params={params} />
    </Suspense>
  );
}

async function Entry({ t, locale, params }: { t: Dictionary; locale: Locale; params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const w = t.staff.access.waitlist;
  const db = createAdminClient();
  const [{ data: e }, { data: plans }] = await Promise.all([
    db
      .from("waitlist")
      .select("id, email, name, company, website, use_case, message, locale, status, confirmed_at, consent_at, consent_version, staff_note, invited_at, reminded_at, registered_at, created_at, invite_code_id, invite_codes!waitlist_invite_code_id_fkey(code)")
      .eq("id", id)
      .maybeSingle(),
    db.from("plans").select("id, name").order("sort_order"),
  ]);
  if (!e) notFound();
  const date = new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Zurich" });
  const d = (v: string | null) => (v ? date.format(new Date(v)) : "–");
  const canEdit = staff.role === "superadmin";
  const row = (label: string, value: ReactNode) => (
    <div className="grid gap-1 border-t border-line py-2.5 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
  return (
    <>
      <Link href="/admin/access/waitlist" className={`${linkClass} text-sm`}>
        ← {w.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{e.email}</h2>
        <Badge tone={STATUS_TONE[e.status]}>{w.statuses[e.status]}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title={w.detail}>
          <dl>
            {row(w.name, e.name ?? "–")}
            {row(w.company, e.company ?? "–")}
            {row(
              w.website,
              e.website ? (
                <a href={e.website} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>
                  {e.website}
                </a>
              ) : (
                "–"
              ),
            )}
            {row(w.useCase, e.use_case ? t.access.waitlist.useCases[e.use_case] : "–")}
            {row(w.message, e.message ? <span className="whitespace-pre-line">{e.message}</span> : "–")}
            {row(w.createdAt, d(e.created_at))}
            {row(w.confirmedAt, e.confirmed_at ? d(e.confirmed_at) : w.notConfirmed)}
            {row(w.consent, `${d(e.consent_at)} · ${e.consent_version}`)}
            {row(w.invitedAt, d(e.invited_at))}
            {row(w.remindedAt, d(e.reminded_at))}
            {row(w.registeredAt, d(e.registered_at))}
            {row(
              w.code,
              e.invite_code_id && e.invite_codes ? (
                <Link href={`/admin/access/codes/${e.invite_code_id}`} className="font-mono font-semibold hover:underline">
                  {e.invite_codes.code}
                </Link>
              ) : (
                "–"
              ),
            )}
          </dl>
        </Card>
        <div className="flex flex-col gap-6">
          {canEdit && e.confirmed_at && e.status !== "registered" ? (
            <Card title={e.invited_at ? w.reinvite : w.inviteTitle}>
              <InviteForm ids={[e.id]} plans={plans ?? []} />
            </Card>
          ) : null}
          <Card title={w.note}>
            <NoteForm id={e.id} note={e.staff_note ?? ""} canEdit={canEdit} />
          </Card>
          {canEdit ? (
            <Card title={w.setStatus}>
              <StatusSelect id={e.id} status={e.status} />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
