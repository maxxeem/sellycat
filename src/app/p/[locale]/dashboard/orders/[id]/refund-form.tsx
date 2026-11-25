"use client";

import { useActionState, useState } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { formatMoney } from "@/lib/shop/deal-status";
import { refundOrder, type RefundState } from "./actions";

export function RefundForm({ orderId, maxCents, currency }: { orderId: string; maxCents: number; currency: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState<RefundState, FormData>(refundOrder.bind(null, orderId), null);
  const [amount, setAmount] = useState((maxCents / 100).toFixed(2));
  const cents = Math.round(Number(amount.replace(",", ".")) * 100);
  const money = (c: number) => formatMoney(c, currency, locale);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(fmt(t.orders.refundConfirm, { amount: money(cents || 0) }))) e.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted">{t.orders.refundHint}</p>
      <Field label={`${t.orders.refundAmount} (${currency})`}>
        <Input name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="restock" defaultChecked disabled={cents !== maxCents} className="h-4 w-4 accent-[var(--color-accent)]" />
        {t.orders.restock}
      </label>
      {state?.error === "invalid" ? <Notice tone="error">{fmt(t.orders.refundInvalid, { max: money(maxCents) })}</Notice> : null}
      {state?.error === "stripe" ? <Notice tone="error">{fmt(t.orders.refundError, { message: state.message ?? "" })}</Notice> : null}
      {state?.ok ? <Notice tone="success">{t.orders.refundDone}</Notice> : null}
      <button type="submit" disabled={pending} className={`${buttonClass.danger} self-start`}>
        {t.orders.refundButton}
      </button>
    </form>
  );
}
