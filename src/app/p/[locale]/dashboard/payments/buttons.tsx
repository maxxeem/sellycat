"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { disconnectStripe } from "./actions";

export function DisconnectButton() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => confirm(t.payments.disconnectConfirm) && start(() => disconnectStripe())} className={buttonClass.danger}>
      {t.payments.disconnect}
    </button>
  );
}
