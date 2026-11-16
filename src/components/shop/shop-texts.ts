import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";

/** Buyer-facing texts of a shop (its own language, not the visitor's). */
export function shopTexts(locale: Locale) {
  return getDictionary(locale).shop;
}
export type ShopTexts = ReturnType<typeof shopTexts>;
