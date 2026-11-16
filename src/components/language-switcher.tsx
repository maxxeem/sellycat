"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABEL } from "@/lib/i18n/locales";

/** Sets the language cookie; the proxy picks it up on the next request. */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">{t.common.language}</span>
      <select
        value={locale}
        onChange={(e) => {
          document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className="rounded-input border border-line bg-surface-2 px-2 py-1 text-sm text-ink"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABEL[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
