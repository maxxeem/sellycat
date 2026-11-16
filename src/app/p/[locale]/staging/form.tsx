"use client";

import { useSearchParams } from "next/navigation";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";

export function StagingForm() {
  const { t } = useI18n();
  const search = useSearchParams();
  return (
    <form method="post" action="/api/staging" className="flex flex-col gap-4">
      <input type="hidden" name="next" value={search.get("next") ?? "/"} />
      <Field label={t.common.password}>
        <Input name="password" type="password" autoComplete="current-password" required autoFocus />
      </Field>
      {search.get("error") ? <Notice tone="error">{t.staging.wrong}</Notice> : null}
      <button type="submit" className={buttonClass.primary}>
        {t.staging.submit}
      </button>
    </form>
  );
}
