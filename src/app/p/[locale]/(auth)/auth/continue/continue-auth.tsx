"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Notice } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { provisionFromSignup } from "../../actions";

/**
 * Turns whatever the auth mail carried into a session: a PKCE `code`, a `token_hash` (custom
 * mail templates) or tokens in the URL fragment (Supabase's default invite links). Then creates
 * the shop from the signup data (first login only) and moves on to `next`.
 */
export function ContinueAuth() {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const next = search.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    (async () => {
      const code = search.get("code");
      const tokenHash = search.get("token_hash");
      const type = search.get("type") as EmailOtpType | null;
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      let error: unknown = null;
      if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
      else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
      else if (fragment.get("access_token") && fragment.get("refresh_token"))
        ({ error } = await supabase.auth.setSession({ access_token: fragment.get("access_token")!, refresh_token: fragment.get("refresh_token")! }));
      else error = new Error("no credentials in link");
      if (error || fragment.get("error")) return setFailed(true);
      await provisionFromSignup();
      router.replace(target);
      router.refresh();
    })();
  }, [router, search]);

  return failed ? <Notice tone="error">{t.auth.linkInvalid}</Notice> : <p className="text-sm text-muted">{t.common.loading}</p>;
}
