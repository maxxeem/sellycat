/** FAQ library of a shop (pure): limits, cleaning and what a saved deal adds to it. */
import { sameFaq } from "./reuse";

export const FAQ_LIBRARY_MAX = 200;
export const FAQ_Q_MAX = 300;
export const FAQ_A_MAX = 3000;

export type Faq = { q: string; a: string };
/** In the deal editor: `keep` = also store it in the library when the deal is saved. */
export type FaqDraft = Faq & { keep?: boolean };

export function cleanFaq(f: { q?: unknown; a?: unknown }): Faq | null {
  const q = typeof f.q === "string" ? f.q.trim().slice(0, FAQ_Q_MAX) : "";
  const a = typeof f.a === "string" ? f.a.trim().slice(0, FAQ_A_MAX) : "";
  return q && a ? { q, a } : null;
}

/** Ticked entries of a deal that the library does not have yet (each once, within the limit). */
export function newForLibrary(entries: FaqDraft[], library: Faq[]): Faq[] {
  const out: Faq[] = [];
  for (const e of entries) {
    const f = e.keep ? cleanFaq(e) : null;
    if (f && ![...library, ...out].some((x) => sameFaq(x, f)) && library.length + out.length < FAQ_LIBRARY_MAX) out.push(f);
  }
  return out;
}
