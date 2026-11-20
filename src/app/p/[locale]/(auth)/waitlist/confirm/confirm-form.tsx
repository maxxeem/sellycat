"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice, buttonClass, linkClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { confirmWaitlistAction } from "../../access-actions";

export function ConfirmForm({ token }: { token: string }) {
  const { t } = useI18n();
  const c = t.access.confirm;
  const [state, action, pending] = useActionState(confirmWaitlistAction, null);
  if (state?.done)
    return (
      <div className="flex flex-col gap-3" role="status" data-testid="waitlist-confirmed">
        <p className="text-lg font-semibold">{c.doneTitle}</p>
        <p className="text-sm text-muted">{c.doneText}</p>
        <Link href="/" className={linkClass}>
          {c.back}
        </Link>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted">{c.text}</p>
      {state && !state.done ? <Notice tone="error">{c.invalid}</Notice> : null}
      <button type="submit" disabled={pending || !token} className={buttonClass.primary} data-testid="waitlist-confirm">
        {pending ? t.common.loading : c.button}
      </button>
    </form>
  );
}
