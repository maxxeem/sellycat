/** Confirmation mails of the deal alert: one per minute, five per day and address. Pure. */
const MAX_PER_DAY = 5;
const DAY = 86_400_000;

export type ConfirmStep = { kind: "send"; count: number } | { kind: "recent" } | { kind: "limit" };

export function nextConfirmMail(lastSentAt: string | null, count: number, now: number): ConfirmStep {
  const age = lastSentAt ? now - Date.parse(lastSentAt) : Infinity;
  if (age < 60_000) return { kind: "recent" };
  // After a quiet day the counter starts again (it used to block an address for good).
  if (age >= DAY) return { kind: "send", count: 1 };
  return count >= MAX_PER_DAY ? { kind: "limit" } : { kind: "send", count: count + 1 };
}
