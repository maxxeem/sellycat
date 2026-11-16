import { de } from "./dictionaries/de";
import { en, type Dictionary } from "./dictionaries/en";
import type { Locale } from "./locales";

export type { Dictionary };
const DICTIONARIES: Record<Locale, Dictionary> = { de, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

/** Fills {placeholders}: fmt("Hello {name}", { name: "Jan" }). */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
