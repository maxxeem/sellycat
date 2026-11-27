"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import {
  codeLogin,
  partnerCodeLogin,
  requestCode,
  type LoginError,
} from "./actions";

const field =
  "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-3 text-base text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

/**
 * Sign-in for redeeming on the shop domain: a partner's code (when the shop has partners on a code),
 * else or as well a six-digit code by email for authorised scanners (no password to remember).
 */
export function RedeemLogin({
  shopName,
  texts,
  withCode = false,
}: {
  shopName: string;
  texts: Pick<Dictionary, "redeem">;
  withCode?: boolean;
}) {
  const t = texts.redeem;
  const [byEmail, setByEmail] = useState(!withCode);
  return (
    <div
      className="shop-card flex flex-col gap-4 p-5"
      data-testid="redeem-login"
    >
      <div>
        <h1 className="shop-heading text-2xl font-bold">{t.loginTitle}</h1>
        <p className="mt-1 text-[var(--shop-muted)]">
          {fmt(withCode ? t.loginIntroCode : t.loginIntro, { shop: shopName })}
        </p>
      </div>
      {withCode ? <PartnerCodeForm texts={texts} /> : null}
      {withCode ? (
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">
          <span className="h-px flex-1 bg-[var(--shop-line)]" />
          {t.or}
          <span className="h-px flex-1 bg-[var(--shop-line)]" />
        </div>
      ) : null}
      {byEmail ? (
        <EmailLogin texts={texts} />
      ) : (
        <button
          type="button"
          onClick={() => setByEmail(true)}
          className="text-sm font-semibold underline underline-offset-2"
          data-testid="redeem-by-email"
        >
          {t.asScanner}
        </button>
      )}
    </div>
  );
}

/** One field: the partner's code, then straight to redeeming. */
function PartnerCodeForm({ texts }: { texts: Pick<Dictionary, "redeem"> }) {
  const t = texts.redeem;
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await partnerCodeLogin(code);
          if (r.ok) router.refresh();
          else setError(r.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{t.partnerCode}</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]*"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          required
          className={`${field} text-center font-mono text-2xl tracking-[0.25em]`}
          data-testid="partner-code-login"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="text-sm font-semibold text-[var(--shop-warning)]"
        >
          {error === "code" ? t.partnerCodeWrong : t.errors[error]}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || code.length < 4}
        className="shop-btn w-full"
        data-testid="partner-code-submit"
      >
        {pending ? "…" : t.partnerCodeGo}
      </button>
    </form>
  );
}

/** Six-digit code by email for authorised scanners. */
function EmailLogin({ texts }: { texts: Pick<Dictionary, "redeem"> }) {
  const t = texts.redeem;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [pending, start] = useTransition();

  const done = (r: { ok: true } | { ok: false; error: LoginError }) => {
    if (r.ok) router.refresh();
    else setError(r.error);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      if (!sent) {
        await requestCode(email);
        setSent(true);
        return;
      }
      done(await codeLogin(email, code));
    });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">{t.email}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          readOnly={sent}
          className={field}
          data-testid="redeem-email"
        />
      </label>
      {sent ? (
        <>
          <p
            className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-3 text-sm"
            role="status"
          >
            {fmt(t.codeSent, { email })}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">{t.codeLabel}</span>
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              required
              className={`${field} text-center font-mono text-2xl tracking-[0.4em]`}
              data-testid="redeem-code-input"
            />
          </label>
        </>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="text-sm font-semibold text-[var(--shop-warning)]"
        >
          {t.errors[error]}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || (sent && code.length !== 6)}
        className="shop-btn w-full"
        data-testid="redeem-login-submit"
      >
        {pending ? "…" : !sent ? t.sendCode : t.login}
      </button>
      {sent ? (
        <div className="flex justify-between text-sm font-semibold">
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
          >
            {t.otherEmail}
          </button>
          <button
            type="button"
            className="underline underline-offset-2"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                setCode("");
                await requestCode(email);
              })
            }
          >
            {t.resend}
          </button>
        </div>
      ) : null}
    </form>
  );
}
