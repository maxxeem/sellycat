/**
 * Partner code for the redemption app (pure, isomorphic): what a code looks like and how a typed one
 * is read. 4 to 8 digits (quick on a phone's number pad); spaces and dashes do not matter.
 */
export const PARTNER_CODE_MIN = 4;
export const PARTNER_CODE_MAX = 8;

export function normalizePartnerCode(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function validPartnerCode(code: string): boolean {
  return new RegExp(`^[0-9]{${PARTNER_CODE_MIN},${PARTNER_CODE_MAX}}$`).test(code);
}

/** A new code: six digits (taken codes are drawn again by the caller). */
export function generatePartnerCode(): string {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}
