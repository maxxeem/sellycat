"use client";

import { ChevronLeft, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { RedeemLogin } from "../../scan/redeem-login";
import { checkCode, sendCode, type AccessError } from "./actions";

const field =
  "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-3 text-base text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

/**
 * What a phone shows after scanning a voucher's QR code: straight to the sign-in for redeeming
 * (partner code or scanner sign-in), nothing about the voucher. Its owner can still open it with
 * a code to the order's address (small link below).
 */
export function VoucherGate({ token, shopName, texts, ownerEmail, notYours, withCode }: { texts: Pick<Dictionary, "redeem" | "voucherAccess">; token: string; shopName: string; ownerEmail: string; notYours: string | null; withCode: boolean }) {
  const t = texts.voucherAccess;
  const [step, setStep] = useState<"scan" | "show">("scan");

  if (step === "show")
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setStep("scan")} className="inline-flex items-center gap-1 self-start text-sm font-semibold underline-offset-2 hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden /> {t.back}
        </button>
        <OwnerCode token={token} texts={texts} ownerEmail={ownerEmail} />
      </div>
    );

  return (
    <div className="flex flex-col gap-4" data-testid="voucher-gate">
      {notYours ? <p className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-3 text-sm font-semibold">{notYours}</p> : null}
      <RedeemLogin shopName={shopName} texts={texts} withCode={withCode} />
      <button type="button" onClick={() => setStep("show")} className="mx-auto inline-flex items-center gap-1.5 text-sm text-[var(--shop-muted)] underline underline-offset-2" data-testid="voucher-show">
        <Eye className="h-4 w-4" aria-hidden /> {t.ownerLink}
      </button>
    </div>
  );
}

/** The owner asks for a code (sent to the order's address) and enters it. */
function OwnerCode({ token, texts, ownerEmail }: { token: string; texts: Pick<Dictionary, "voucherAccess">; ownerEmail: string }) {
  const t = texts.voucherAccess;
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
