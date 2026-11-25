"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { provisionFromSignup } from "../../actions";
import { ResendForm } from "../../forms";
import { safeNext } from "@/lib/site/routing";

/**
 * Turns what the link carried into a session: a PKCE `code` (Google) or a `token_hash` (our own
 * mails). Never tokens from the URL fragment: a link could sign a person into a foreign account. Then creates
 * the shop from the signup data (first login only) and moves on to `next`.
 *
 * A `token_hash` is only redeemed by a click: mail scanners open links (some even run scripts), and
 * a one-time link opened by the scanner would be used up before the person sees it.
 *
 * The browser client also redeems a `code` on its own (`detectSessionInUrl`), so our own exchange
 * can lose that race and fail although the user is signed in. A failure therefore only counts
 * when there is no session afterwards.
 */
export function ContinueAuth() {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const needsClick = Boolean(search.get("token_hash") && search.get("type"));
  const recovery = search.get("next")?.startsWith("/set-password") ?? false;
  const [busy, setBusy] = useState(false);

  const redeem = useCallback(() => {
    // A link is single-use: never redeem it twice (re-render, Strict Mode).
    if (started.current) return;
    started.current = true;
    const supabase = createClient();
    const next = search.get("next");
    const target = safeNext(next);
    (async () => {
      const code = search.get("code");
      const tokenHash = search.get("token_hash");
      const type = search.get("type") as EmailOtpType | null;
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      let error: unknown = null;
      if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
      else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
      else error = new Error("no credentials in link");
      if (error || fragment.get("error")) {
        // getUser waits for the client's own URL detection, so a session it created counts.
        const { data } = await supabase.auth.getUser();
        if (!data.user) return setFailed(true);
      }
      await provisionFromSignup();
      router.replace(target);
      router.refresh();
    })();
  }, [router, search]);

  useEffect(() => {
    if (!needsClick) redeem();
  }, [needsClick, redeem]);

  if (failed)
    return (
      <div className="flex flex-col gap-4" data-testid="continue-failed">
        <Notice tone="error">{t.auth.linkInvalid}</Notice>
        {recovery ? (
          <Link href="/forgot" className={buttonClass.primary}>
            {t.auth.requestNewLink}
          </Link>
        ) : (
          <>
            <p className="text-sm text-muted">{t.auth.linkUsedHint}</p>
            <Link href="/login" className={buttonClass.primary}>
              {t.auth.loginSubmit}
            </Link>
            <p className="text-sm text-muted">{t.auth.linkResendHint}</p>
            <ResendForm />
          </>
        )}
      </div>
    );
  if (needsClick)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{recovery ? t.auth.continueRecoveryText : t.auth.continueConfirmText}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            redeem();
          }}
          className={buttonClass.primary}
          data-testid="continue-button"
        >
          {busy ? t.common.loading : recovery ? t.auth.continueRecovery : t.auth.continueConfirm}
        </button>
      </div>
    );
  return <p className="text-sm text-muted">{t.common.loading}</p>;
}
