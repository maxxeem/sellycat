"use client";

import { Power, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import type { ShopState } from "@/lib/shop/shop-state";
import { setShopState } from "./shop-state-actions";

/** Put the shop online right away, or take it offline (with a confirmation). */
export function ShopStateSwitch({ state, className = "" }: { state: ShopState; className?: string }) {
  const { t } = useI18n();
  const s = t.dashboard.shopState;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const go = (next: "online" | "closed") =>
    start(async () => {
      setFailed(false);
      const r = await setShopState(next);
      if (!r.ok) setFailed(true);
      router.refresh();
    });
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      {state === "online" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(s.confirmOffline)) go("closed");
          }}
          className={buttonClass.secondary}
          data-testid="shop-offline"
        >
          <Power className="h-4 w-4" aria-hidden /> {pending ? "…" : s.takeOffline}
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => go("online")} className={buttonClass.primary} data-testid="shop-online">
          <Rocket className="h-4 w-4" aria-hidden /> {pending ? "…" : state === "closed" ? s.reopen : s.goOnline}
        </button>
      )}
      {failed ? <span className="text-xs text-danger">{t.common.error}</span> : null}
    </span>
  );
}

/** «Publish shop» in the getting-started steps: the first time the shop goes online. */
export function PublishShopButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setFailed(false);
            const r = await setShopState("online");
            if (!r.ok) setFailed(true);
            router.refresh();
          })
        }
        className={buttonClass.primary}
        data-testid="shop-publish"
      >
        <Rocket className="h-4 w-4" aria-hidden /> {pending ? "…" : t.dashboard.shopState.publish}
      </button>
      {failed ? <span className="text-xs text-danger">{t.common.error}</span> : null}
    </span>
  );
}
