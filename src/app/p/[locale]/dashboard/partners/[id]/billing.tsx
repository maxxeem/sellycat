"use client";

import { useState, useTransition } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import type { PartnerBilling } from "@/lib/settlements/billing";
import { savePartnerBilling } from "../actions";

/** Legal name, address, VAT number and IBAN of a partner (for statements). */
export function BillingForm({ partnerId, billing }: { partnerId: string; billing: PartnerBilling }) {
  const { t } = useI18n();
  const b = t.partners.billing;
  const [f, setF] = useState({ legal_name: "", street: "", zip: "", city: "", country: "CH", vat_no: "", iban: "", ...billing });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const input = (k: keyof typeof f, label: string, extra: Record<string, unknown> = {}) => (
    <Field label={label}>
      <Input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
    </Field>
  );
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await savePartnerBilling(partnerId, f as Record<string, string>);
          setMsg(r.ok ? { tone: "success", text: t.common.saved } : { tone: "error", text: r.error === "iban" ? b.ibanInvalid : t.common.error });
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {input("legal_name", b.legalName)}
        {input("vat_no", b.vatNo)}
      </div>
      {input("street", b.street, { autoComplete: "street-address" })}
      <div className="grid grid-cols-[100px_1fr_80px] gap-3">
        {input("zip", b.zip)}
        {input("city", b.city)}
        {input("country", b.country, { maxLength: 2 })}
      </div>
      {input("iban", b.iban, { placeholder: "CH00 0000 0000 0000 0000 0", autoComplete: "off" })}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <div>
        <button type="submit" disabled={pending} className={buttonClass.secondary}>
          {pending ? t.common.loading : t.common.save}
        </button>
      </div>
    </form>
  );
}
