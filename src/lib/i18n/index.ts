import { de } from "./dictionaries/de";
import { en, type Dictionary } from "./dictionaries/en";
import type { Locale } from "./locales";

export type { Dictionary };
const DICTIONARIES: Record<Locale, Dictionary> = { de, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

export { fmt } from "./fmt";
