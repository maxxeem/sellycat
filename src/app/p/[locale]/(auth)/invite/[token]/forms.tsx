"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { acceptInvite, acceptWithPassword, signOutForInvite, type AcceptState } from "./actions";

export function AcceptButton({ token }: { token: string }) {
  const { t } = useI18n();
  const a = t.team.accept;
  const [pending, start] = useTransition();
  const [error, setError] = useState<AcceptState>(null);
  return (
    <>
      {error?.error ? <Notice tone="error">{a.errors[error.error]}</Notice> : null}
      <button type="button" className={buttonClass.primary} disabled={pending} onClick={() => start(async () => setError(await acceptInvite(token)))} data-testid="invite-accept">
        {pending ? "…" : a.join}
      </button>
    </>
  );
}

export function PasswordJoinForm({ token }: { token: string }) {
  const { t } = useI18n();
  const a = t.team.accept;
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptWithPassword.bind(null, token), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm">{a.setPassword}</p>
      <Field label={a.name}>
        <Input name="name" autoComplete="name" maxLength={120} />
      </Field>
      <Field label={a.password}>
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      {state?.error ? <Notice tone="error">{a.errors[state.error]}</Notice> : null}
      <button type="submit" className={buttonClass.primary} disabled={pending} data-testid="invite-join">
        {pending ? "…" : a.joinWithPassword}
      </button>
    </form>
  );
}

export function SignOutButton({ token, label }: { token: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => start(() => signOutForInvite(token))}>
      {pending ? "…" : label}
    </button>
  );
}
