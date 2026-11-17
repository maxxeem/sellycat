"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";
import { voidVoucher } from "../redemptions/actions";

export function VoidButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="ml-3 text-sm font-medium text-danger hover:underline disabled:opacity-50"
      onClick={() => {
        if (!window.confirm(t.vouchers.voidConfirm)) return;
        start(async () => {
          const r = await voidVoucher(id);
          if (!r.ok && r.error) window.alert(t.vouchers.errors[r.error]);
        });
      }}
    >
      {t.vouchers.void}
    </button>
  );
}
