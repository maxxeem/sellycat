"use client";

import { ScanLine, Trash2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import type { Scanner } from "@/lib/vouchers/scanners";
import { addScanner, deleteScanner } from "../actions";

/** Authorised scanners of one partner: invite by name and email, remove. */
export function Scanners({ partnerId, partnerName, scanUrl, scanners, canManage }: { partnerId: string; partnerName: string; scanUrl: string; scanners: Scanner[]; canManage: boolean }) {
  const { t, locale } = useI18n();
  const s = t.scanners;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { timeZone: "Europe/Zurich" });

  return (
    <div className="flex flex-col gap-4" data-testid="scanners">
      <p className="text-sm text-muted">{fmt(s.intro, { partner: partnerName, url: scanUrl.replace(/^https?:\/\//, "") })}</p>
      {scanners.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-input border border-line">
          {scanners.map((sc) => (
            <li key={sc.userId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <ScanLine className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{sc.name || sc.email}</span>
                  <span className="block truncate text-xs text-muted">
                    {sc.email} · {fmt(s.since, { date: date(sc.since) })}
                  </span>
                </span>
              </span>
              {canManage ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(fmt(s.removeConfirm, { name: sc.name || sc.email }))) return;
                    start(async () => {
                      const r = await deleteScanner(partnerId, sc.userId);
                      setMessage(r.ok ? null : { tone: "error", text: s.errors.failed });
                    });
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> {s.remove}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{s.empty}</p>
      )}

      {canManage ? (
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1.3fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setMessage(null);
              const r = await addScanner(partnerId, name, email);
              if (!r.ok) return setMessage({ tone: "error", text: s.errors[r.error] });
              setMessage({ tone: "success", text: r.mailed ? fmt(s.invited, { name }) : fmt(s.invitedNoMail, { url: scanUrl }) });
              setName("");
              setEmail("");
            });
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.name} className={inputClass} required maxLength={120} data-testid="scanner-name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={s.email} type="email" className={inputClass} required data-testid="scanner-email" />
          <button type="submit" disabled={pending} className={buttonClass.primary} data-testid="scanner-add">
            <UserPlus className="h-4 w-4" aria-hidden /> {pending ? "…" : s.add}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted">{s.adminOnly}</p>
      )}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}
