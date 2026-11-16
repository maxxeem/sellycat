"use client";

import { useActionState, useState } from "react";
import { Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALE_LABEL } from "@/lib/i18n/locales";
import { slugify } from "@/lib/site/hosts";
import { createTenant } from "../../actions";

export function NewTenantForm({ plans, root }: { plans: Array<{ id: string; name: string }>; root: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(createTenant, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const shown = slug ?? slugify(name);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.staff.name}>
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label={t.staff.slug} hint={`${shown || "…"}.${root}`}>
        <Input name="slug" value={shown} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
      </Field>
      <Field label={t.staff.owner} hint={t.staff.ownerHint}>
        <Input name="ownerEmail" type="email" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.common.language}>
          <Select name="locale" defaultValue="de">
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABEL[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.staff.plan}>
          <Select name="planId" defaultValue={plans[0]?.id}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.staff.createTenant}
      </button>
    </form>
  );
}
