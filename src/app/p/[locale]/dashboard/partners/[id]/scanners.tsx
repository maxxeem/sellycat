"use client";

import { KeyRound, RefreshCw, ScanLine, Trash2, UserPlus, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import type { PartnerCode, Scanner } from "@/lib/vouchers/scanners";
import { addScanner, deleteScanner, removeScanCode, saveScanCode } from "../actions";

/**
 * Who redeems this partner's vouchers: either authorised scanners (sign-in with an email code) or
 * one code for the whole partner (entered on the phone, no sign-in). Never both.
 */
export function Scanners({ partnerId, partnerName, scanUrl, scanners, code, canManage }: { partnerId: string; partnerName: string; scanUrl: string; scanners: Scanner[]; code: PartnerCode; canManage: boolean }) {
  const { t } = useI18n();
  const s = t.scanners;
  const [mode, setMode] = useState<"scanners" | "code">(code.active ? "code" : "scanners");
  const choice = (key: "scanners" | "code", Icon: typeof Users, title: string, hint: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === key}
      disabled={!canManage && mode !== key}
      onClick={() => setMode(key)}
      className={`flex items-start gap-3 rounded-input border p-3 text-left text-sm transition ${mode === key ? "border-ink bg-surface-2" : "border-line hover:border-muted"}`}
      data-testid={`scan-mode-${key}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={s.modeLabel} className="grid gap-2 sm:grid-cols-2">
        {choice("scanners", Users, s.modeScanners, s.modeScannersHint)}
        {choice("code", KeyRound, s.modeCode, s.modeCodeHint)}
      </div>
      {mode === "scanners" ? (
        code.active ? (
          <SwitchToScanners partnerId={partnerId} canManage={canManage} onCancel={() => setMode("code")} />
        ) : (
          <ScannerList partnerId={partnerId} partnerName={partnerName} scanUrl={scanUrl} scanners={scanners} canManage={canManage} />
        )
      ) : (
        <CodePanel partnerId={partnerId} scanUrl={scanUrl} code={code} scannerCount={code.active ? 0 : scanners.length} canManage={canManage} onCancel={() => setMode("scanners")} />
      )}
    </div>
  );
}

/** The partner's code: set, replace (typed or generated), shown once after saving. */
function CodePanel({ partnerId, scanUrl, code, scannerCount, canManage, onCancel }: { partnerId: string; scanUrl: string; code: PartnerCode; scannerCount: number; canManage: boolean; onCancel: () => void }) {
  const { t, locale } = useI18n();
  const s = t.scanners;
  const [value, setValue] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [editing, setEditing] = useState(!code.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { timeZone: "Europe/Zurich" });
  const save = (raw: string) => {
    if (scannerCount > 0 && !window.confirm(fmt(s.codeConfirmScanners, { count: String(scannerCount) }))) return;
    if (code.active && !window.confirm(s.codeConfirmReplace)) return;
    start(async () => {
      setError(null);
      const r = await saveScanCode(partnerId, raw);
      if (!r.ok) return setError(s.codeErrors[r.error]);
      setShown(r.code);
      setValue("");
      setEditing(false);
    });
  };
  return (
    <div className="flex flex-col gap-3" data-testid="partner-code">
      <p className="text-sm text-muted">{fmt(s.codeIntro, { url: scanUrl.replace(/^https?:\/\//, "") })}</p>
      {shown ? (
        <div className="rounded-input border border-line bg-surface-2 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.codeNew}</p>
          <p className="mt-1 select-all font-mono text-3xl font-bold tracking-[0.2em]" data-testid="partner-code-value">{shown}</p>
          <p className="mt-2 text-xs text-muted">{s.codeOnce}</p>
        </div>
      ) : code.active && code.since ? (
        <Notice tone="success">{fmt(s.codeActive, { date: date(code.since) })}</Notice>
      ) : null}
      {!canManage ? (
        <p className="text-xs text-muted">{s.adminOnly}</p>
      ) : editing ? (
        <form
          className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            save(value);
          }}
        >
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder={s.codePlaceholder} className={`${inputClass} font-mono placeholder:font-sans`} inputMode="numeric" pattern="[0-9]*" maxLength={8} autoComplete="off" data-testid="partner-code-input" />
          <button type="submit" disabled={pending || value.length < 4} className={buttonClass.primary} data-testid="partner-code-save">
            {pending ? "…" : s.codeSave}
          </button>
          <button type="button" disabled={pending} onClick={() => save("")} className={buttonClass.secondary} data-testid="partner-code-generate">
            <RefreshCw className="h-4 w-4" aria-hidden /> {s.codeGenerate}
          </button>
          <p className="text-xs text-muted sm:col-span-3">{s.codeRules}</p>
          {!code.active ? (
            <button type="button" onClick={onCancel} className="justify-self-start text-xs font-semibold text-muted underline underline-offset-2 sm:col-span-3">
              {s.codeCancel}
            </button>
          ) : null}
        </form>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={`${buttonClass.secondary} self-start`} data-testid="partner-code-change">
          <KeyRound className="h-4 w-4" aria-hidden /> {s.codeChange}
        </button>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}

/** Leaving the code: it stops working, then scanners can be invited again. */
function SwitchToScanners({ partnerId, canManage, onCancel }: { partnerId: string; canManage: boolean; onCancel: () => void }) {
  const { t } = useI18n();
  const s = t.scanners;
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-input border border-line p-4 text-sm">
      <p>{s.switchToScanners}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canManage || pending}
          className={buttonClass.primary}
          data-testid="partner-code-remove"
          onClick={() =>
            start(async () => {
              const r = await removeScanCode(partnerId);
              setFailed(!r.ok);
            })
          }
        >
          {pending ? "…" : s.switchConfirm}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass.secondary}>
          {s.codeCancel}
        </button>
      </div>
      {failed ? <Notice tone="error">{s.errors.failed}</Notice> : null}
    </div>
  );
}

/** Authorised scanners of one partner: invite by name and email, remove. */
function ScannerList({ partnerId, partnerName, scanUrl, scanners, canManage }: { partnerId: string; partnerName: string; scanUrl: string; scanners: Scanner[]; canManage: boolean }) {
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
