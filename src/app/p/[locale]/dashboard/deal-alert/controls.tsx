"use client";

import { Bell, BellOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { removeSubscriber, setDealAlert } from "./actions";

export function AlertSwitch({ on }: { on: boolean }) {
  const { t } = useI18n();
  const a = t.dealAlertAdmin;
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={on ? buttonClass.secondary : buttonClass.primary}
        data-testid="deal-alert-switch"
        onClick={() => {
          if (on && !window.confirm(a.offConfirm)) return;
          start(async () => {
            setFailed(!(await setDealAlert(!on)).ok);
            router.refresh();
          });
        }}
      >
        {on ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />} {pending ? "…" : on ? a.turnOff : a.turnOn}
      </button>
      {failed ? <span className="text-xs text-danger">{t.common.error}</span> : null}
    </span>
  );
}

export function RemoveButton({ id, email }: { id: string; email: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={fmt(t.dealAlertAdmin.remove, { email })}
      className="rounded-input p-2 text-muted hover:bg-danger/10 hover:text-danger"
      onClick={() => {
        if (window.confirm(fmt(t.dealAlertAdmin.removeConfirm, { email })))
          start(async () => {
            await removeSubscriber(id);
            router.refresh();
          });
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
