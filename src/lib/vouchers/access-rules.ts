/** Pure helpers for "show voucher with an email code" (tested). */

/** "jane.doe@gmail.com" → "ja•••@gmail.com": enough to recognise the address, not to learn it. */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!local || !domain) return "•••";
  const keep = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, keep)}•••@${domain}`;
}

/** Cookie for the device that showed a voucher (scoped to that voucher's page). */
export const ACCESS_COOKIE = "sc_va";
export const ACCESS_DAYS = 30;
export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;
export const tokenPattern = /^[A-Za-z0-9_-]{20,64}$/;
