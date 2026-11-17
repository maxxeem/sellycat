/** Texts of other deals of the same shop that the editor offers for reuse (pure, tested). */

export type ReuseSource = { title: string; terms: string | null; faq: unknown };
export type ReusableTerms = { text: string; from: string };
export type ReusableFaq = { q: string; a: string; from: string };

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Distinct conditions texts and FAQ entries, in the order of `deals` (newest first), each with
 * the deal it was first found in. Duplicates (ignoring spaces and case) appear once.
 */
export function reusableTexts(deals: ReuseSource[]): { terms: ReusableTerms[]; faq: ReusableFaq[] } {
  const terms: ReusableTerms[] = [];
  const faq: ReusableFaq[] = [];
  const seenTerms = new Set<string>();
  const seenFaq = new Set<string>();
  for (const d of deals) {
    const text = d.terms?.trim();
    if (text && !seenTerms.has(norm(text))) {
      seenTerms.add(norm(text));
      terms.push({ text, from: d.title });
    }
    if (!Array.isArray(d.faq)) continue;
    for (const item of d.faq as Array<{ q?: unknown; a?: unknown }>) {
      if (typeof item?.q !== "string" || typeof item.a !== "string" || !item.q.trim() || !item.a.trim()) continue;
      const key = `${norm(item.q)}\n${norm(item.a)}`;
      if (seenFaq.has(key)) continue;
      seenFaq.add(key);
      faq.push({ q: item.q.trim(), a: item.a.trim(), from: d.title });
    }
  }
  return { terms, faq };
}

/** Same question and answer (ignoring spaces and case): already in the deal. */
export const sameFaq = (x: { q: string; a: string }, y: { q: string; a: string }) => norm(x.q) === norm(y.q) && norm(x.a) === norm(y.a);

/** Conditions after taking over an earlier text: appended below existing text, or instead of it. */
export function mergeTerms(current: string, text: string, mode: "replace" | "append"): string {
  return mode === "replace" || !current.trim() ? text : `${current.trimEnd()}\n\n${text}`;
}
