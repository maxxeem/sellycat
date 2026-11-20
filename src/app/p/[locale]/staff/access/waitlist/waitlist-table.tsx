"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Badge, Field, Input, Notice, Select, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import { USE_CASES, WAITLIST_STATUSES, type UseCase, type WaitlistStatus } from "@/lib/access/rules";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { intlTag } from "@/lib/i18n/locales";
import { inviteAction, setWaitlistStatusAction } from "../actions";
import { STATUS_TONE } from "./shared";

type Row = { id: string; email: string; name: string | null; company: string | null; website: string | null; use_case: UseCase | null; status: WaitlistStatus; confirmed_at: string | null; invited_at: string | null; reminded_at: string | null; registered_at: string | null; created_at: string };
type Plan = { id: string; name: string };

export function WaitlistTable({ rows, plans, canEdit }: { rows: Row[]; plans: Plan[]; canEdit: boolean }) {
  const { t, locale } = useI18n();
  const w = t.staff.access.waitlist;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const date = new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium" });
  const toggle = (id: string) => setSelected((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const all = selected.size === rows.length;
  const ids = [...selected];
  return (
    <div className="flex flex-col gap-4">
      {canEdit && selected.size ? (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-4">
          <p className="text-sm font-semibold">{fmt(w.selected, { count: selected.size })}</p>
          <InviteForm ids={ids} plans={plans} onDone={() => setSelected(new Set())} />
          <button type="button" disabled={pending} onClick={() => start(async () => (await setWaitlistStatusAction(ids, "rejected"), setSelected(new Set())))} className={`${buttonClass.secondary} self-start`}>
            {w.reject}
          </button>
        </div>
      ) : null}
      <Table>
        <thead>
          <tr>
            {canEdit ? (
              <th className={thClass}>
                <input type="checkbox" aria-label={w.selectAll} checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} className="size-4 accent-[var(--accent)]" />
              </th>
            ) : null}
            <th className={thClass}>{w.email}</th>
            <th className={thClass}>{w.company}</th>
            <th className={thClass}>{w.useCase}</th>
            <th className={thClass}>{w.status}</th>
            <th className={thClass}>{w.createdAt}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-surface">
              {canEdit ? (
                <td className={tdClass}>
                  <input type="checkbox" aria-label={r.email} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-[var(--accent)]" data-testid="waitlist-select" />
                </td>
              ) : null}
              <td className={tdClass}>
                <Link href={`/admin/access/waitlist/${r.id}`} className="font-semibold hover:underline">
                  {r.email}
                </Link>
                {r.name ? <p className="text-xs text-muted">{r.name}</p> : null}
              </td>
              <td className={tdClass}>{r.company ?? "–"}</td>
              <td className={tdClass}>{r.use_case ? t.access.waitlist.useCases[r.use_case] : "–"}</td>
              <td className={tdClass}>
                <div className="flex flex-col items-start gap-1">
                  <Badge tone={STATUS_TONE[r.status]}>{w.statuses[r.status]}</Badge>
                  {!r.confirmed_at ? <span className="text-xs text-muted">{w.notConfirmed}</span> : null}
                  {r.invited_at && r.status === "invited" ? <span className="text-xs text-muted">{date.format(new Date(r.invited_at))}</span> : null}
                </div>
              </td>
              <td className={tdClass}>{date.format(new Date(r.created_at))}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export function InviteForm({ ids, plans, onDone }: { ids: string[]; plans: Plan[]; onDone?: () => void }) {
  const { t } = useI18n();
  const w = t.staff.access.waitlist;
  const c = t.staff.access.codes;
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof inviteAction>[0], form: FormData) => {
    const r = await inviteAction(prev, form);
    if (r && !("error" in r)) onDone?.();
    return r;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-3" data-testid="waitlist-invite">
      {ids.map((id) => (
        <input key={id} type="hidden" name="id" value={id} />
      ))}
      <p className="text-xs text-muted">{w.inviteHint}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={c.plan}>
          <Select name="planId" defaultValue="">
            <option value="">{c.planNone}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={c.trialDays}>
          <Input name="trialDays" type="number" min={0} max={365} />
        </Field>
        <Field label={c.coupon}>
          <Input name="couponId" maxLength={64} />
        </Field>
        <Field label={w.expiresDays}>
          <Input name="expiresDays" type="number" min={1} max={365} defaultValue={30} />
        </Field>
      </div>
      {state ? <Notice tone={"error" in state ? "error" : "success"}>{"error" in state ? t.common.error : fmt(w.inviteResult, state)}</Notice> : null}
      <button type="submit" disabled={pending || !ids.length} className={`${buttonClass.primary} self-start`} data-testid="waitlist-invite-submit">
        {pending ? t.common.loading : w.invite}
      </button>
    </form>
  );
}

export function WaitlistFilters({ q, status, useCase, unconfirmed }: { q: string; status: string; useCase: string; unconfirmed: boolean }) {
  const { t } = useI18n();
  const a = t.staff.access;
  const router = useRouter();
  const go = (next: Record<string, string>) => {
    const p = new URLSearchParams({ q, status, useCase, unconfirmed: unconfirmed ? "1" : "", ...next });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    router.replace(`/admin/access/waitlist${p.size ? `?${p}` : ""}`);
  };
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
      }}
    >
      <Input name="q" type="search" defaultValue={q} placeholder={a.search} aria-label={a.search} className="w-56" />
      <Select size="sm" value={status} onChange={(e) => go({ status: e.target.value })} aria-label={a.waitlist.status}>
        <option value="">{a.waitlist.allStatus}</option>
        {WAITLIST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {a.waitlist.statuses[s]}
          </option>
        ))}
      </Select>
      <Select size="sm" value={useCase} onChange={(e) => go({ useCase: e.target.value })} aria-label={a.waitlist.useCase}>
        <option value="">{a.waitlist.allUseCases}</option>
        {USE_CASES.map((u) => (
          <option key={u} value={u}>
            {t.access.waitlist.useCases[u]}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={unconfirmed} onChange={(e) => go({ unconfirmed: e.target.checked ? "1" : "" })} className="size-4 accent-[var(--accent)]" />
        {a.waitlist.unconfirmed}
      </label>
    </form>
  );
}
