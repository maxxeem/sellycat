"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ShopTexts } from "@/components/shop/shop-texts";
import { fmt } from "@/lib/i18n";
import { confirmDealAlert, stopDealAlert } from "../../../alert-actions";

/** One button, so mail scanners that only open links neither confirm nor unsubscribe anyone. */
export function AlertAction({ action, token, shop, t }: { action: "confirm" | "off"; token: string; shop: string; t: ShopTexts }) {
  const a = t.dealAlert;
  const [done, setDone] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const text = done === null ? (action === "confirm" ? a.confirmText : a.offText) : !done ? a.confirmInvalid : action === "confirm" ? a.confirmed : a.offDone;
  const title = done === null ? (action === "confirm" ? a.confirmTitle : a.offTitle) : !done ? a.confirmInvalidTitle : action === "confirm" ? a.confirmedTitle : a.offDoneTitle;
  return (
    <>
      <h1 className="shop-heading text-2xl font-bold">{title}</h1>
      <p role="status" className="text-[var(--shop-muted)]" data-testid="alert-status">{fmt(text, { shop })}</p>
      {done === null ? (
        <button type="button" disabled={pending} className="shop-btn w-full" onClick={() => start(async () => setDone(await (action === "confirm" ? confirmDealAlert(token) : stopDealAlert(token))))} data-testid="alert-go">
          {pending ? "…" : action === "confirm" ? a.confirmButton : a.offButton}
        </button>
      ) : (
        <Link href="/" className="shop-btn w-full">{a.toShop}</Link>
      )}
    </>
  );
}
