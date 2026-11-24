"use client";

import { useState, useTransition } from "react";
import { linkClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { resendConfirmationAction } from "../../actions";

/** Staff: send a customer who has not confirmed the address yet a new confirmation mail. */
export function ResendButton({ useId }: { useId: string }) {
  const { t } = useI18n();
  const c = t.staff.access.codes;
  const [pending, start] = useTransition();
  const [result, setResult] = useState<"sent" | "confirmed" | "failed" | null>(null);
  if (result) return <span className="text-xs text-muted" role="status">{c.resendResult[result]}</span>;
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => setResult(await resendConfirmationAction(useId)))} className={`${linkClass} text-left text-xs`}>
      {pending ? t.common.loading : c.resend}
    </button>
  );
}
