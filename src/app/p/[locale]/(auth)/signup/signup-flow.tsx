"use client";

import { useActionState, useState } from "react";
import { WaitlistForm } from "@/components/access/waitlist-form";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import type { SignupMode } from "@/lib/access/rules";
import { useI18n } from "@/lib/i18n/context";
import { checkCodeAction } from "../access-actions";
import { SignupForm } from "../forms";

/**
 * /signup by mode: open → form; invite → code first (or straight to the form with a valid
 * ?code=); closed → waitlist, with a code entry for people who got an invitation.
 */
export function SignupFlow({ mode, root, initialCode, turnstileKey }: { mode: SignupMode; root: string; initialCode: string | null; turnstileKey: string | null }) {
  const { t } = useI18n();
  const [code, setCode] = useState<string | null>(initialCode);
  const [view, setView] = useState<"code" | "waitlist">(mode === "paused" ? "waitlist" : "code");

  if (mode === "open" || code) return <SignupForm root={root} code={code ?? ""} onChangeCode={code ? () => setCode(null) : undefined} />;

  if (view === "waitlist")
    return (
      <div className="flex flex-col gap-5" data-testid="signup-waitlist">
        {mode === "paused" ? (
          <div data-testid="signup-paused">
            <Notice>{`${t.access.closedTitle}. ${t.access.closedText}`}</Notice>
          </div>
        ) : null}
        <WaitlistForm turnstileKey={turnstileKey} compact />
        <button type="button" onClick={() => setView("code")} className="self-start text-sm font-semibold text-accent-text underline" data-testid="signup-have-code">
          {t.access.code.haveCode}
        </button>
      </div>
    );

  return <CodeStep onValid={setCode} onWaitlist={() => setView("waitlist")} />;
}

function CodeStep({ onValid, onWaitlist }: { onValid: (code: string) => void; onWaitlist: () => void }) {
  const { t } = useI18n();
  const c = t.access.code;
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof checkCodeAction>[0], form: FormData) => {
    const r = await checkCodeAction(prev, form);
    if (r?.ok) onValid(r.code);
    return r;
  }, null);
  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-4" data-testid="code-step">
        <p className="text-sm text-muted">{c.intro}</p>
        <Field label={c.label} error={state && !state.ok ? c.invalid : undefined}>
          <Input name="code" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={60} placeholder={c.placeholder} className="font-mono uppercase tracking-wider" data-testid="code-input" />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass.primary} data-testid="code-submit">
          {pending ? t.common.loading : c.submit}
        </button>
      </form>
      <p className="text-sm text-muted">
        {c.noCode}{" "}
        <button type="button" onClick={onWaitlist} className="font-semibold text-accent-text underline">
          {c.toWaitlist}
        </button>
      </p>
    </div>
  );
}
