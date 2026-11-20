"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { DateTimePicker } from "@/components/date-time-picker";
import { Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { codeLink } from "@/lib/access/rules";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { createCodesAction } from "../actions";

type Plan = { id: string; name: string };
export type CodeValues = { maxUses: number | null; expiresLocal: string; planId: string | null; trialDays: number | null; couponId: string | null; tag: string | null; note: string | null };

/** The perk fields shared by "create" and "edit". */
export function PerkFields({ plans, values }: { plans: Plan[]; values?: CodeValues }) {
  const { t } = useI18n();
  const c = t.staff.access.codes;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label={c.maxUses} hint={c.maxUsesHint}>
        <Input name="maxUses" type="number" min={1} defaultValue={values ? (values.maxUses ?? "") : "1"} />
      </Field>
      <Field label={c.expires}>
        <DateTimePicker name="expires" mode="datetime" defaultValue={values?.expiresLocal ?? ""} />
      </Field>
      <Field label={c.plan} hint={c.planHint}>
        <Select name="planId" defaultValue={values?.planId ?? ""}>
          <option value="">{c.planNone}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={c.trialDays} hint={c.trialHint}>
        <Input name="trialDays" type="number" min={0} max={365} defaultValue={values?.trialDays ?? ""} />
      </Field>
      <Field label={c.coupon} hint={c.couponHint}>
        <Input name="couponId" maxLength={64} pattern="[A-Za-z0-9_\-]*" defaultValue={values?.couponId ?? ""} />
      </Field>
      <Field label={c.tag}>
        <Input name="tag" maxLength={60} defaultValue={values?.tag ?? ""} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label={c.note}>
          <Input name="note" maxLength={500} defaultValue={values?.note ?? ""} />
        </Field>
      </div>
    </div>
  );
}

export function CreateCodes({ plans }: { plans: Plan[] }) {
  const { t } = useI18n();
  const c = t.staff.access.codes;
  const [kind, setKind] = useState<"single" | "bulk">("single");
  const [state, action, pending] = useActionState(createCodesAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" data-testid="create-codes">
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" className="inline-flex self-start rounded-button border border-line bg-surface p-1">
        {(["single", "bulk"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-input px-4 py-1.5 text-sm font-semibold ${kind === k ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}>
            {c[k]}
          </button>
        ))}
      </div>
      {kind === "single" ? (
        <Field label={c.custom} hint={c.customHint}>
          <Input name="custom" maxLength={40} className="font-mono uppercase" autoComplete="off" data-testid="code-custom" />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c.count}>
            <Input name="count" type="number" min={1} max={500} defaultValue={10} required />
          </Field>
          <Field label={c.prefix} hint={c.prefixHint}>
            <Input name="prefix" maxLength={20} className="font-mono uppercase" />
          </Field>
        </div>
      )}
      <PerkFields plans={plans} />
      {state && !state.ok ? <Notice tone="error">{c[state.error]}</Notice> : null}
      {state?.ok ? <CreatedCodes codes={state.codes} /> : null}
      <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`} data-testid="code-create">
        {pending ? t.common.loading : c.create}
      </button>
    </form>
  );
}

function CreatedCodes({ codes }: { codes: string[] }) {
  const { t } = useI18n();
  const c = t.staff.access.codes;
  return (
    <div className="flex flex-col gap-2 rounded-input border border-success/40 bg-success/10 p-3 text-sm" role="status">
      <p className="font-semibold text-success">{fmt(c.created, { count: codes.length })}</p>
      <p className="max-h-32 overflow-auto font-mono text-xs">{codes.join(", ")}</p>
    </div>
  );
}

export function CopyLink({ code }: { code: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass.secondary}
      onClick={async () => {
        await navigator.clipboard.writeText(codeLink(window.location.origin, code));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? t.staff.access.codes.copied : t.staff.access.codes.copyLink}
    </button>
  );
}

export function CodeFilters({ q, state, tag, tags }: { q: string; state: string; tag: string; tags: string[] }) {
  const { t } = useI18n();
  const a = t.staff.access;
  const router = useRouter();
  const go = (next: Record<string, string>) => {
    const p = new URLSearchParams({ q, state, tag, ...next });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    router.replace(`/admin/access/codes${p.size ? `?${p}` : ""}`);
  };
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
      }}
    >
      <Input name="q" type="search" defaultValue={q} placeholder={a.search} aria-label={a.search} className="w-56" />
      <Select size="sm" value={state} onChange={(e) => go({ state: e.target.value })} aria-label={a.codes.state}>
        <option value="">{a.allStates}</option>
        {(["active", "disabled", "expired", "used_up"] as const).map((s) => (
          <option key={s} value={s}>
            {a.codes.states[s]}
          </option>
        ))}
      </Select>
      {tags.length ? (
        <Select size="sm" value={tag} onChange={(e) => go({ tag: e.target.value })} aria-label={a.codes.tag}>
          <option value="">{a.allTags}</option>
          {tags.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>
      ) : null}
    </form>
  );
}
