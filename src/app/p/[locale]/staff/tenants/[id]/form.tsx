"use client";

import { useActionState } from "react";
import { Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { updateTenant } from "../../actions";

const STATUSES = ["trial", "active", "suspended", "closed"] as const;

export function TenantSettingsForm(props: { id: string; status: string; planId: string; feeBps: number | null; plans: Array<{ id: string; name: string }> }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateTenant, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={props.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.staff.status}>
          <Select name="status" defaultValue={props.status}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.staff.plan}>
          <Select name="planId" defaultValue={props.planId}>
            {props.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Application Fee (%)" hint="Leer = Wert aus dem Plan">
        <Input name="feeBps" inputMode="decimal" defaultValue={props.feeBps !== null ? String(props.feeBps / 100) : ""} />
      </Field>
      {state?.error ? <Notice tone="error">{state.error}</Notice> : state?.ok ? <Notice tone="success">{t.common.saved}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}
