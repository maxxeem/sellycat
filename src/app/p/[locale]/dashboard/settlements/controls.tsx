"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Notice, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { changeStatus, createAll, recreate, send, type SettleResult } from "./actions";

function useRun() {
  const { t } = useI18n();
  const s = t.settlements;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const run = (fn: () => Promise<SettleResult>, ok: (r: SettleResult) => string, after?: () => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (r.ok) {
        setMsg({ tone: "success", text: ok(r) });
        after?.();
      } else setMsg({ tone: "error", text: r.error === "email" ? s.noEmail : s.failed });
      router.refresh();
    });
  return { pending, msg, run, s };
}

/** «Create statements» for every partner with open items up to the chosen day, or one partner. */
export function CreateButton({ until, partnerId, label, primary = false }: { until: string; partnerId?: string; label: string; primary?: boolean }) {
  const { pending, msg, run, s } = useRun();
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" disabled={pending} className={primary ? buttonClass.primary : buttonClass.secondary} onClick={() => run(() => createAll(until, partnerId), (r) => (r.count ? fmt(s.created, { count: r.count }) : s.createdNone))}>
        {label}
      </button>
      {msg && primary ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </div>
  );
}

export function SettlementActions({ id, status, email }: { id: string; status: "draft" | "final" | "paid"; email: string | null }) {
  const { pending, msg, run, s } = useRun();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/dashboard/settlements/${id}/pdf`} target="_blank" rel="noopener" className={buttonClass.secondary}>{s.pdf}</a>
        <a href={`/api/dashboard/settlements/${id}/csv`} className={buttonClass.secondary}>{s.csv}</a>
        {status === "draft" ? (
          <>
            <button type="button" disabled={pending} className={buttonClass.secondary} onClick={() => run(() => recreate(id), () => s.recreate)}>{s.recreate}</button>
            <button type="button" disabled={pending} className={buttonClass.primary} onClick={() => confirm(s.finalizeConfirm) && run(() => changeStatus(id, "final"), () => s.final)}>{s.finalize}</button>
            <button type="button" disabled={pending} className={`${buttonClass.ghost} text-danger`} onClick={() => run(() => changeStatus(id, "deleted"), () => s.deleteDraft, () => router.push("/dashboard/settlements"))}>{s.deleteDraft}</button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={pending || !email}
              className={buttonClass.secondary}
              onClick={() => email && confirm(fmt(s.sendConfirm, { email })) && run(() => send(id), (r) => fmt(s.sent, { email: r.email ?? email }))}
            >
              {s.send}
            </button>
            {status === "final" ? (
              <button type="button" disabled={pending} className={buttonClass.primary} onClick={() => run(() => changeStatus(id, "paid"), () => s.paid)}>{s.markPaid}</button>
            ) : (
              <button type="button" disabled={pending} className={buttonClass.ghost} onClick={() => run(() => changeStatus(id, "final"), () => s.final)}>{s.unpay}</button>
            )}
          </>
        )}
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </div>
  );
}
