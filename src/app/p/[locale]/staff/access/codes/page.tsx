import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import { codeState } from "@/lib/access/rules";
import { searchTerm } from "@/lib/access/staff";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { CodeFilters, CreateCodes } from "./code-forms";
import { STATE_TONE, perksText } from "./shared";

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function CodesPage({ params, searchParams }: PageProps<"/p/[locale]/staff/access/codes">) {
  const { t, locale } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Codes t={t} locale={locale} searchParams={searchParams} />
    </Suspense>
  );
}

async function Codes({ t, locale, searchParams }: { t: Dictionary; locale: Locale; searchParams: Promise<Query> }) {
  const staff = await requireStaff();
  const a = t.staff.access;
  const c = a.codes;
  const q = await searchParams;
  const term = searchTerm(one(q.q));
  const state = one(q.state);
  const tag = one(q.tag);
  const db = createAdminClient();
  let query = db.from("invite_codes").select("id, code, uses, max_uses, expires_at, disabled_at, plan_id, trial_days, stripe_coupon_id, tag, note, created_at").order("created_at", { ascending: false }).limit(500);
  if (term) query = query.or(`code.ilike.*${term}*,note.ilike.*${term}*,tag.ilike.*${term}*`);
  if (tag) query = query.eq("tag", tag);
  const [{ data: rows }, { data: plans }, { data: tagRows }] = await Promise.all([
    query,
    db.from("plans").select("id, name").order("sort_order"),
    db.from("invite_codes").select("tag").not("tag", "is", null).order("tag").limit(1000),
  ]);
  const list = (rows ?? []).map((r) => ({ ...r, state: codeState(r) })).filter((r) => !state || r.state === state);
  const tags = [...new Set((tagRows ?? []).map((r) => r.tag!))];
  const date = new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium" });
  const exportQuery = new URLSearchParams({ kind: "codes", ...(term ? { q: term } : {}), ...(tag ? { tag } : {}) }).toString();

  return (
    <>
      {staff.role === "superadmin" ? (
        <Card title={c.new}>
          <CreateCodes plans={plans ?? []} />
        </Card>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <CodeFilters q={term} state={state} tag={tag} tags={tags} />
        <div className="flex gap-2">
          <a href={`/api/staff/access/export?${exportQuery}`} className={buttonClass.secondary}>
            {a.export}
          </a>
          <a href="/api/staff/access/export?kind=uses" className={buttonClass.secondary}>
            {a.exportUses}
          </a>
        </div>
      </div>
      {!list.length ? (
        <EmptyState title={c.empty} />
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={thClass}>{c.code}</th>
              <th className={thClass}>{c.state}</th>
              <th className={thClass}>{c.uses}</th>
              <th className={thClass}>{c.expires}</th>
              <th className={thClass}>{c.perks}</th>
              <th className={thClass}>{c.tag}</th>
              <th className={thClass}>{c.createdAt}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-surface">
                <td className={tdClass}>
                  <Link href={`/admin/access/codes/${r.id}`} className="font-mono font-semibold tracking-wide hover:underline">
                    {r.code}
                  </Link>
                  {r.note ? <p className="max-w-56 truncate text-xs text-muted">{r.note}</p> : null}
                </td>
                <td className={tdClass}>
                  <Badge tone={STATE_TONE[r.state]}>{c.states[r.state]}</Badge>
                </td>
                <td className={`${tdClass} tabular-nums`}>
                  {r.uses} / {r.max_uses ?? c.unlimited}
                </td>
                <td className={tdClass}>{r.expires_at ? date.format(new Date(r.expires_at)) : "–"}</td>
                <td className={`${tdClass} text-xs text-muted`}>{perksText(t, r) || "–"}</td>
                <td className={tdClass}>{r.tag ?? "–"}</td>
                <td className={tdClass}>{date.format(new Date(r.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
