import { getDictionary } from "./index";
import { isLocale, type Locale } from "./locales";

/** Locale + dictionary from a route's `params` (the proxy always puts a valid locale there). */
export async function fromParams(params: Promise<{ locale: string }>): Promise<{ locale: Locale; t: ReturnType<typeof getDictionary> }> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  return { locale, t: getDictionary(locale) };
}
