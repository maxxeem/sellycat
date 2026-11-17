"use client";

import { useState, useTransition } from "react";
import type { ShopTexts } from "@/components/shop/shop-texts";
import { fmt } from "@/lib/i18n";
import { requestMyLink } from "./actions";

export function MyForm({ tenantId, t }: { tenantId: string; t: ShopTexts }) {
  const [sent, setSent] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [pending, start] = useTransition();
  const field = "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-2.5 text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

  if (sent)
    return (
      <p role="status" className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-4" data-testid="my-sent">
        ✉️ {fmt(t.mySent, { email: sent })}
      </p>
    );
  return (
    <form
      className="flex flex-col gap-3"
      action={(form) =>
        start(async () => {
          const r = await requestMyLink(tenantId, String(form.get("email") ?? ""));
          setInvalid(!r.ok);
          if (r.ok && r.email) setSent(r.email);
        })
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{t.email}</span>
        <input type="email" name="email" required autoComplete="email" className={field} data-testid="my-email" />
      </label>
      {invalid ? <p role="alert" className="text-sm font-semibold text-[var(--shop-warning)]">{t.checkoutErrors.email}</p> : null}
      <button type="submit" disabled={pending} className="shop-btn w-full">
        {pending ? "…" : t.mySend}
      </button>
    </form>
  );
}
