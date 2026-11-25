"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ShopTexts } from "@/components/shop/shop-texts";
import { fmt } from "@/lib/i18n";
import { confirmDealAlert, stopDealAlert } from "../../../alert-actions";

/**
 * Confirming happens on its own when the page opens (the click in the mail is the consent). It runs
 * in the browser only, so scanners that merely fetch the link confirm nobody. Unsubscribing keeps
 * its button: a scanner must never delete someone's alert.
 */
export function AlertAction({ action, token, shop, t }: { action: "confirm" | "off"; token: string; shop: string; t: ShopTexts }) {
  const a = t.dealAlert;
  const [done, setDone] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const run = useCallback(
    () =>
      start(async () => {
        setFailed(false);
        try {
          setDone(await (action === "confirm" ? confirmDealAlert(token) : stopDealAlert(token)));
        } catch {
          setFailed(true);
        }
      }),
    [action, token],
  );
  useEffect(() => {
    if (action !== "confirm" || started.current) return;
    started.current = true;
    run();
  }, [action, run]);
  const auto = action === "confirm" && !failed;
  const text = done === null ? (auto ? a.confirming : action === "confirm" ? a.confirmText : a.offText) : !done ? a.confirmInvalid : action === "confirm" ? a.confirmed : a.offDone;
  const title = done === null ? (action === "confirm" ? a.confirmTitle : a.offTitle) : !done ? a.confirmInvalidTitle : action === "confirm" ? a.confirmedTitle : a.offDoneTitle;
  return (
    <>
      <h1 className="shop-heading text-2xl font-bold">{title}</h1>
      <p role="status" className="text-[var(--shop-muted)]" data-testid="alert-status">{fmt(text, { shop })}</p>
      {done === null ? auto ? null : (
        <button type="button" disabled={pending} className="shop-btn w-full" onClick={run} data-testid="alert-go">
          {pending ? "…" : action === "confirm" ? a.confirmButton : a.offButton}
        </button>
      ) : (
        <Link href="/" className="shop-btn w-full">{a.toShop}</Link>
      )}
    </>
  );
}
