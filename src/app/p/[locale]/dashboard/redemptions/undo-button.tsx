"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/context";
import { undoRedemption } from "./actions";

export function UndoButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm font-medium text-muted hover:text-danger hover:underline disabled:opacity-50"
      onClick={() => {
        if (!window.confirm(t.vouchers.undoConfirm)) return;
        start(async () => {
          const r = await undoRedemption(id);
          if (!r.ok && r.error) window.alert(t.vouchers.errors[r.error]);
        });
      }}
    >
      {t.vouchers.undo}
    </button>
  );
}
