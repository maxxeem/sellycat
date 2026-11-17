"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fmt, getDictionary } from "@/lib/i18n";
import { codeLogin, passwordLogin, requestCode, type LoginError } from "./actions";

const field =
  "w-full rounded-[var(--shop-radius)] border border-[var(--shop-line)] bg-[var(--shop-surface)] px-3 py-3 text-base text-[var(--shop-text)] outline-none focus:border-[var(--shop-primary)]";

/** Sign-in on the shop domain: six-digit code by email (default) or password. */
export function RedeemLogin({ shopName, locale }: { shopName: string; locale: "de" | "en" }) {
  const t = getDictionary(locale).redeem;
  const router = useRouter();
  const [mode, setMode] = useState<"code" | "password">("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (mode === "password") return done(await passwordLogin(email, password));
      if (!sent) {
        await requestCode(email);
        setSent(true);
        return;
      }
      done(await codeLogin(email, code));
    });

  return (
    <div className="shop-card flex flex-col gap-4 p-5" data-testid="redeem-login">
      <div>
        <h1 className="shop-heading text-2xl font-bold">{t.loginTitle}</h1>
        <p className="mt-1 text-[var(--shop-muted)]">{fmt(t.loginIntro, { shop: shopName })}</p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-1 text-sm font-semibold" role="tablist">
        {(["code", "password"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-[calc(var(--shop-radius)-2px)] px-3 py-2 ${mode === m ? "bg-[var(--shop-bg)] shadow-sm" : "text-[var(--shop-muted)]"}`}
          >
            {m === "code" ? t.withCode : t.withPassword}
          </button>
        ))}
      </div>
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
            readOnly={mode === "code" && sent}
            className={field}
            data-testid="redeem-email"
          />
        </label>
        {mode === "password" ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">{t.password}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={field} />
          </label>
        ) : sent ? (
          <>
            <p className="rounded-[var(--shop-radius)] bg-[var(--shop-surface)] p-3 text-sm" role="status">
              {fmt(t.codeSent, { email })}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="font-semibold">{t.codeLabel}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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
          <p role="alert" className="text-sm font-semibold text-[var(--shop-warning)]">
            {t.errors[error]}
          </p>
        ) : null}
        <button type="submit" disabled={pending || (mode === "code" && sent && code.length !== 6)} className="shop-btn w-full" data-testid="redeem-login-submit">
          {pending ? "…" : mode === "code" && !sent ? t.sendCode : t.login}
        </button>
        {mode === "code" && sent ? (
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
    </div>
  );
}
