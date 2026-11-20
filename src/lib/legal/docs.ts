import type { Locale } from "@/lib/i18n/locales";
import * as de from "./content/de";
import * as en from "./content/en";

/**
 * Sellycat's own legal texts (operator: my105 GmbH). Markdown, rendered with the help-center
 * renderer. `LEGAL_VERSION` is stored with every signup (user metadata) as proof of what was
 * accepted: raise it whenever the terms or the DPA change in substance.
 */
export const LEGAL_VERSION = "2026-11-20";
export const LEGAL_DOCS = ["imprint", "terms", "privacy", "dpa"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const isLegalDoc = (v: string): v is LegalDoc => (LEGAL_DOCS as readonly string[]).includes(v);

const TEXTS: Record<Locale, Record<LegalDoc, string>> = { de, en };

/** Title (first `# ` line) and body of a document. */
export function legalDoc(locale: Locale, doc: LegalDoc): { title: string; body: string } {
  const source = TEXTS[locale][doc].trim();
  const first = source.split("\n", 1)[0];
  return { title: first.replace(/^#\s+/, ""), body: source.slice(first.length).trim() };
}
