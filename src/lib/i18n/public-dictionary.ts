import type { Dictionary } from "./index";

/**
 * Texts that client components of the public pages use (start page, sign-in, contact, help …). The
 * dashboard and the staff admin add the full dictionary in their own layouts; sending all of it
 * with every public page would more than double those pages. `public-dictionary.test.ts` checks
 * that nothing is missing.
 */
export const PUBLIC_KEYS = ["access", "auth", "common", "contact", "legal", "team", "staging"] as const satisfies ReadonlyArray<keyof Dictionary>;

export function publicDictionary(d: Dictionary): Dictionary {
  return Object.fromEntries(PUBLIC_KEYS.map((k) => [k, d[k]])) as unknown as Dictionary;
}
