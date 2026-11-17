"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { resendMail } from "./actions";

export function ResendButton({ orderId, kind, email }: { orderId: string; kind: "order" | "gift"; email: string }) {
  const { t } = useI18n();
  const o = t.orders;
  const [pending, start] = useTransition();
  const [result, setResult] = useState<boolean | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className={`${buttonClass.secondary} w-full`}
        onClick={() => {
          if (!window.confirm(fmt(o.resendConfirm, { email }))) return;
          start(async () => setResult((await resendMail(orderId, kind)).ok));
        }}
      >
        {pending ? "…" : kind === "gift" ? o.resendGift : o.resend}
      </button>
      {result !== null ? (
        <p role="status" className={`text-sm font-semibold ${result ? "text-success" : "text-danger"}`}>
          {result ? o.resendDone : o.resendFailed}
        </p>
      ) : null}
    </div>
  );
}
