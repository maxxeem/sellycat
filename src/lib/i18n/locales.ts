/**
 * Supported UI languages (isomorphic). English is the fallback; adding FR/IT means adding the
 * code here and a dictionary file in ./dictionaries (a test checks that all keys match).
 */
export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_LABEL: Record<Locale, string> = { de: "Deutsch", en: "English" };
/** Cookie set by the language switcher on Sellycat's own pages. */
export const LOCALE_COOKIE = "sc_lang";

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** Best supported language for an Accept-Language header ("de-CH,de;q=0.9,en;q=0.8" → "de"). */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.split("=")[1]) : 1, i };
    })
    .filter((r) => r.lang && !Number.isNaN(r.q))
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const r of ranked) if (isLocale(r.lang)) return r.lang;
  return DEFAULT_LOCALE;
}

/** Locale for Sellycat's own pages: cookie first, then the browser's languages. */
export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  return isLocale(cookie) ? cookie : pickLocale(acceptLanguage);
}

/** Intl tag for dates and numbers (Swiss formats). */
export const intlTag = (locale: Locale) => (locale === "de" ? "de-CH" : "en-CH");
