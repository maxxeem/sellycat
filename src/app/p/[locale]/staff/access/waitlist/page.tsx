import { Suspense } from "react";
import { EmptyState, Skeleton, buttonClass } from "@/components/ui";
import { USE_CASES, WAITLIST_STATUSES } from "@/lib/access/rules";
import { searchTerm } from "@/lib/access/staff";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { WaitlistFilters, WaitlistTable } from "./waitlist-table";

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function WaitlistPage({ params, searchParams }: PageProps<"/p/[locale]/staff/access/waitlist">) {
  const { t } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Waitlist t={t} searchParams={searchParams} />
    </Suspense>
  );
}

async function Waitlist({ t, searchParams }: { t: Dictionary; searchParams: Promise<Query> }) {
  const staff = await requireStaff();
  const a = t.staff.access;
  const q = await searchParams;
  const term = searchTerm(one(q.q));
  const status = (WAITLIST_STATUSES as readonly string[]).includes(one(q.status)) ? (one(q.status) as (typeof WAITLIST_STATUSES)[number]) : "";
  const useCase = (USE_CASES as readonly string[]).includes(one(q.useCase)) ? (one(q.useCase) as (typeof USE_CASES)[number]) : "";
  const unconfirmed = one(q.unconfirmed) === "1";
  const db = createAdminClient();
  let query = db
    .from("waitlist")
    .select("id, email, name, company, website, use_case, status, confirmed_at, invited_at, reminded_at, registered_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (term) query = query.or(`email.ilike.*${term}*,name.ilike.*${term}*,company.ilike.*${term}*,message.ilike.*${term}*,staff_note.ilike.*${term}*`);
  if (status) query = query.eq("status", status);
  if (useCase) query = query.eq("use_case", useCase);
  if (!unconfirmed) query = query.not("confirmed_at", "is", null);
  const [{ data: rows }, { data: plans }] = await Promise.all([query, db.from("plans").select("id, name").order("sort_order")]);
  const exportQuery = new URLSearchParams({ kind: "waitlist", ...(term ? { q: term } : {}), ...(status ? { status } : {}), ...(useCase ? { useCase } : {}), ...(unconfirmed ? { unconfirmed: "1" } : {}) }).toString();
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <WaitlistFilters q={term} status={status} useCase={useCase} unconfirmed={unconfirmed} />
        <a href={`/api/staff/access/export?${exportQuery}`} className={buttonClass.secondary}>
          {a.export}
        </a>
      </div>
      {!rows?.length ? <EmptyState title={a.waitlist.empty} /> : <WaitlistTable rows={rows} plans={plans ?? []} canEdit={staff.role === "superadmin"} />}
    </>
  );
}
