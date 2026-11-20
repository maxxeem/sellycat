"use client";

import { useActionState } from "react";
import { Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { updateCodeAction } from "../../actions";
import { PerkFields, type CodeValues } from "../code-forms";

export function EditCode({ id, active, plans, values }: { id: string; active: boolean; plans: { id: string; name: string }[]; values: CodeValues }) {
  const { t } = useI18n();
  const c = t.staff.access.codes;
  const [state, action, pending] = useActionState(updateCodeAction.bind(null, id), null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="active" defaultChecked={active} className="size-4 accent-[var(--accent)]" data-testid="code-active" />
        {c.active}
      </label>
      <PerkFields plans={plans} values={values} />
      {state ? <Notice tone={state.ok ? "success" : "error"}>{state.ok ? t.staff.access.saved : t.common.error}</Notice> : null}
      <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`}>
        {pending ? t.common.loading : c.save}
      </button>
    </form>
  );
}
