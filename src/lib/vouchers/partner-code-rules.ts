/**
 * Partner code for the redemption app (pure, isomorphic): what a code looks like and how a typed one
 * is read. Spaces, dashes and case do not matter; 8–32 letters or digits.
 */
export const PARTNER_CODE_MIN = 8;
export const PARTNER_CODE_MAX = 32;

export function normalizePartnerCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function validPartnerCode(code: string): boolean {
  return new RegExp(`^[A-Z0-9]{${PARTNER_CODE_MIN},${PARTNER_CODE_MAX}}$`).test(code);
}

/** A new code: eight digits (quick to type on a phone's number pad). */
export function generatePartnerCode(): string {
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}
