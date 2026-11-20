"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABEL } from "@/lib/i18n/locales";
import { Select } from "./select";

/** Sets the language cookie; the proxy picks it up on the next request. */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  return (
    <Select
        size="sm"
        aria-label={t.common.language}
        value={locale}
        onChange={(e) => {
          document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABEL[l]}
          </option>
        ))}
      </Select>
  );
}
