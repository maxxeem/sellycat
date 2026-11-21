"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Field, Input, Notice, buttonClass, linkClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { slugify } from "@/lib/site/hosts";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { forgotAction, loginAction, setPasswordAction, signupAction, type AuthState } from "./actions";

function useMessage(state: AuthState) {
  const { t } = useI18n();
  const dict = t.auth as Record<string, string>;
  return {
    error: state?.error ? (dict[state.error] ?? t.common.error) : null,
    notice: state?.notice ? (dict[state.notice] ?? state.notice) : null,
  };
}

export function LoginForm({ google = false }: { google?: boolean }) {
  const { t } = useI18n();
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(loginAction, null);
  const { error } = useMessage(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      {google ? (
        <>
          <GoogleButton label={t.auth.googleLogin} next={next || "/dashboard"} />
          <OrDivider label={t.auth.or} />
        </>
      ) : null}
      <input type="hidden" name="next" value={next} />
      <Field label={t.common.email}>
        <Input name="email" type="email" autoComplete="email" required data-testid="login-email" />
      </Field>
      <Field label={t.common.password}>
        <Input name="password" type="password" autoComplete="current-password" required data-testid="login-password" />
      </Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary} data-testid="login-submit">
        {pending ? t.common.loading : t.auth.loginSubmit}
      </button>
      <Link href="/forgot" className={`${linkClass} text-sm`}>
        {t.auth.forgot}
      </Link>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(forgotAction, null);
  const { notice } = useMessage(state);
  if (notice) return <Notice tone="success">{notice}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t.auth.forgotText}</p>
      <Field label={t.common.email}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.auth.forgotSubmit}
      </button>
    </form>
  );
}

export function SetPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(setPasswordAction, null);
  const { error } = useMessage(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.common.password} hint={t.auth.passwordTooShort}>
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label={t.auth.passwordRepeat}>
        <Input name="repeat" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.auth.setPasswordSubmit}
      </button>
    </form>
  );
}

export function SignupForm({ root, code = "", onChangeCode, google = false }: { root: string; code?: string; onChangeCode?: () => void; google?: boolean }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(signupAction, null);
  const { error, notice } = useMessage(state);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  if (notice) return <Notice tone="success">{notice}</Notice>;
  const shownSlug = slugTouched ? slug : slugify(name);
  return (
    <form action={action} className="flex flex-col gap-4">
      {/* With Google the shop is set up on /welcome after the sign-in (a code travels along). */}
      {google ? (
        <>
          <GoogleButton label={t.auth.googleSignup} next={code ? `/welcome?code=${encodeURIComponent(code)}` : "/welcome"} />
          <OrDivider label={t.auth.or} />
        </>
      ) : null}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="code" value={code} />
      {code ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-success/40 bg-success/10 px-3 py-2 text-sm text-success" data-testid="signup-code">
          <span>{fmt(t.access.code.applied, { code })}</span>
          {onChangeCode ? (
            <button type="button" onClick={onChangeCode} className="font-semibold underline">
              {t.access.code.change}
            </button>
          ) : null}
        </div>
      ) : null}
      <Field label={t.auth.shopName}>
        <Input name="shopName" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
      </Field>
      <Field label={t.auth.shopSlug} error={state?.field === "slug" ? (error ?? undefined) : undefined} hint={`${shownSlug || "…"}.${root}`}>
        <Input
          name="slug"
          value={shownSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          required
          maxLength={40}
          pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
        />
      </Field>
      <Field label={t.common.email}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t.common.password} hint={t.auth.passwordTooShort}>
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="accept" required className="mt-1 size-4 shrink-0 accent-[var(--accent)]" data-testid="signup-accept" />
        <span>
          {t.legal.acceptBefore}
          <a href="/legal/terms" target="_blank" className="font-semibold text-ink underline">{t.legal.terms}</a>
          {t.legal.acceptAnd}
          <a href="/legal/dpa" target="_blank" className="font-semibold text-ink underline">{t.legal.dpa}</a>
          {t.legal.acceptMiddle}
          <a href="/legal/privacy" target="_blank" className="font-semibold text-ink underline">{t.legal.privacy}</a>
          {t.legal.acceptAfter}
        </span>
      </label>
      {error && state?.field !== "slug" ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.auth.signupSubmit}
      </button>
    </form>
  );
}
