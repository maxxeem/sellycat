"use client";

import { ChevronLeft, ChevronRight, Eye, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fmt, getDictionary } from "@/lib/i18n";
import { RedeemLogin } from "../../scan/redeem-login";
import { checkCode, sendCode, type AccessError } from "./actions";

const field =
  "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-3 text-base text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

/**
 * What a phone shows after scanning a voucher's QR code (before anything about the voucher is
 * revealed): staff and partners sign in to redeem, the owner confirms with a code by email.
 */
export function VoucherGate({ token, title, shopName, locale, ownerEmail, notYours }: { token: string; title: string; shopName: string; locale: "de" | "en"; ownerEmail: string; notYours: string | null }) {
  const t = getDictionary(locale).voucherAccess;
  const [step, setStep] = useState<"menu" | "scan" | "show">("menu");
  const back = (
    <button type="button" onClick={() => setStep("menu")} className="inline-flex items-center gap-1 self-start text-sm font-semibold underline-offset-2 hover:underline">
      <ChevronLeft className="h-4 w-4" aria-hidden /> {t.back}
    </button>
  );

  if (step === "scan")
    return (
      <div className="flex flex-col gap-3">
        {back}
        <RedeemLogin shopName={shopName} locale={locale} />
      </div>
    );
  if (step === "show")
    return (
      <div className="flex flex-col gap-3">
        {back}
        <OwnerCode token={token} locale={locale} ownerEmail={ownerEmail} />
      </div>
    );

  const option = (key: "scan" | "show", Icon: typeof Eye, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => setStep(key)}
      className="shop-card flex w-full items-center gap-4 p-5 text-left transition hover:-translate-y-0.5"
      data-testid={`voucher-${key}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--shop-primary)] text-[var(--shop-on-primary)]">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="shop-heading block text-lg font-bold">{label}</span>
        <span className="block text-sm text-[var(--shop-muted)]">{hint}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--shop-muted)]" aria-hidden />
    </button>
  );

  return (
    <div className="flex flex-col gap-4" data-testid="voucher-gate">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{shopName}</p>
        <h1 className="shop-heading mt-1 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-[var(--shop-muted)]">{t.menuTitle}</p>
      </div>
      {notYours ? <p className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-3 text-sm font-semibold">{notYours}</p> : null}
      {option("scan", ScanLine, t.scanTitle, t.scanHint)}
      {option("show", Eye, t.showTitle, t.showHint)}
    </div>
  );
}

/** The owner asks for a code (sent to the order's address) and enters it. */
function OwnerCode({ token, locale, ownerEmail }: { token: string; locale: "de" | "en"; ownerEmail: string }) {
  const t = getDictionary(locale).voucherAccess;
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<AccessError | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      setCode("");
      const r = await sendCode(token);
      if (r.ok) setSentTo(r.to);
      else setError(r.error);
    });
  const check = () =>
    start(async () => {
      setError(null);
      const r = await checkCode(token, code);
      if (r.ok) router.refresh();
      else setError(r.error);
    });

  return (
    <div className="shop-card flex flex-col gap-4 p-5" data-testid="voucher-owner">
      <h1 className="shop-heading text-2xl font-bold">{t.showTitle}</h1>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (sentTo) check();
          else send();
        }}
      >
        {sentTo ? (
          <>
            <p className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-3 text-sm" role="status">
              {fmt(t.sentTo, { email: sentTo })}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold">{t.code}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                className={`${field} text-center font-mono text-2xl tracking-[0.4em]`}
                data-testid="voucher-code-input"
              />
            </label>
          </>
        ) : (
          <p className="text-[var(--shop-muted)]">{fmt(t.verifyIntro, { email: ownerEmail })}</p>
        )}
        {error ? (
          <p role="alert" className="text-sm font-semibold text-[var(--shop-warning)]">
            {t.errors[error]}
          </p>
        ) : null}
        <button type="submit" disabled={pending || (Boolean(sentTo) && code.length !== 6)} className="shop-btn w-full" data-testid="voucher-code-submit">
          {pending ? "…" : sentTo ? t.confirm : t.send}
        </button>
        {sentTo ? (
          <button type="button" onClick={send} disabled={pending} className="text-sm font-semibold underline underline-offset-2">
            {t.resend}
          </button>
        ) : null}
        <p className="text-center text-xs text-[var(--shop-muted)]">{t.remembered}</p>
      </form>
    </div>
  );
}
