"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { createDeal } from "./actions";

export function NewDealButton() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => createDeal(t.deals.add))} className={buttonClass.primary} data-testid="new-deal">
      <Plus className="h-4 w-4" aria-hidden /> {t.deals.add}
    </button>
  );
}
