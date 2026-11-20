import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton, Table, linkClass, tdClass, thClass } from "@/components/ui";
import { codeState } from "@/lib/access/rules";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { requireStaff } from "@/lib/platform/staff";
import { isoToZurichLocal } from "@/lib/shop/time";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyLink } from "../code-forms";
import { STATE_TONE } from "../shared";
import { EditCode } from "./edit-code";

export default async function CodePage({ params }: PageProps<"/p/[locale]/staff/access/codes/[id]">) {
  const { t, locale } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Code t={t} locale={locale} params={params} />
    </Suspense>
  );
}

async function Code({ t, locale, params }: { t: Dictionary; locale: Locale; params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = t.staff.access.codes;
  const db = createAdminClient();
  const [{ data: code }, { data: uses }, { data: plans }] = await Promise.all([
    db.from("invite_codes").select("*, waitlist!invite_codes_waitlist_fk(email)").eq("id", id).maybeSingle(),
    db.from("invite_code_uses").select("id, email, status, created_at, confirmed_at, tenant_id, tenants(name, slug)").eq("code_id", id).order("created_at", { ascending: false }).limit(1000),
    db.from("plans").select("id, name").order("sort_order"),
  ]);
  if (!code) notFound();
  const state = codeState(code);
  const date = new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Zurich" });
  return (
    <>
      <Link href="/admin/access/codes" className={`${linkClass} text-sm`}>
        ← {c.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-2xl font-bold tracking-wide">{code.code}</h2>
        <Badge tone={STATE_TONE[state]}>{c.states[state]}</Badge>
        <span className="text-sm text-muted tabular-nums">
          {c.uses}: {code.uses} / {code.max_uses ?? c.unlimited}
        </span>
        <CopyLink code={code.code} />
      </div>
      {code.waitlist?.email ? <p className="text-sm text-muted">{fmt(c.personal, { email: code.waitlist.email })}</p> : null}
      {staff.role === "superadmin" ? (
        <Card title={c.edit}>
          <EditCode
            id={code.id}
            active={!code.disabled_at}
            plans={plans ?? []}
            values={{ maxUses: code.max_uses, expiresLocal: isoToZurichLocal(code.expires_at), planId: code.plan_id, trialDays: code.trial_days, couponId: code.stripe_coupon_id, tag: code.tag, note: code.note }}
          />
        </Card>
      ) : null}
      <Card title={c.usesTitle}>
        {!uses?.length ? (
          <EmptyState title={c.noUses} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={thClass}>{c.email}</th>
                <th className={thClass}>{c.status}</th>
                <th className={thClass}>{c.shop}</th>
                <th className={thClass}>{c.createdAt}</th>
              </tr>
            </thead>
            <tbody>
              {uses.map((u) => (
                <tr key={u.id}>
                  <td className={tdClass}>{u.email}</td>
                  <td className={tdClass}>
                    <Badge tone={u.status === "confirmed" ? "green" : u.status === "pending" ? "amber" : "neutral"}>{c.useStates[u.status]}</Badge>
                  </td>
                  <td className={tdClass}>
                    {u.tenant_id && u.tenants ? (
                      <Link href={`/admin/tenants/${u.tenant_id}`} className="font-semibold hover:underline">
                        {u.tenants.name}
                      </Link>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className={tdClass}>{date.format(new Date(u.confirmed_at ?? u.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
