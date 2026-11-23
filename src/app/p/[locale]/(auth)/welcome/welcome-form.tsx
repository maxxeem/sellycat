"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { slugify } from "@/lib/site/hosts";
import { welcomeAction } from "../actions";

/** Shop name, address, invite code (when signup is not open) and the terms, for a Google account. */
export function WelcomeForm({ email, suggestedName, root, needsCode, initialCode, additional = false }: { email: string; suggestedName: string; root: string; needsCode: boolean; initialCode: string; additional?: boolean }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(welcomeAction, null);
  const dict = t.auth as Record<string, string>;
  const error = state?.error ? (dict[state.error] ?? t.common.error) : null;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const shownSlug = slugTouched ? slug : slugify(name);
  return (
    <form action={action} className="flex flex-col gap-4" data-testid="welcome-form">
      <p className="text-sm text-muted">{fmt(additional ? t.auth.newShopIntro : t.auth.welcomeIntro, { email })}</p>
      <input type="hidden" name="locale" value={locale} />
      {additional ? <input type="hidden" name="additional" value="1" /> : null}
      <Field label={t.auth.shopName}>
        <Input name="shopName" value={name} onChange={(e) => setName(e.target.value)} placeholder={suggestedName} required maxLength={120} />
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
      {needsCode ? (
        <Field label={t.access.code.label} error={state?.field === "code" ? (error ?? undefined) : undefined}>
          <Input name="code" defaultValue={initialCode} required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={60} className="font-mono uppercase tracking-wider" />
        </Field>
      ) : null}
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="accept" required className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
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
      {error && state?.field !== "slug" && state?.field !== "code" ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary} data-testid="welcome-submit">
        {pending ? t.common.loading : t.auth.welcomeSubmit}
      </button>
      {needsCode ? (
        <p className="text-sm text-muted">
          {t.access.code.noCode}{" "}
          <Link href="/signup" className="font-semibold text-accent-text underline">
            {t.access.code.toWaitlist}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
