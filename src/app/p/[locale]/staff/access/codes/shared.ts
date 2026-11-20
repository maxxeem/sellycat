import type { BadgeTone } from "@/components/ui";
import type { CodeState } from "@/lib/access/rules";
import type { Dictionary } from "@/lib/i18n";

export const STATE_TONE: Record<CodeState, BadgeTone> = { active: "green", disabled: "neutral", expired: "amber", used_up: "red" };

export function perksText(t: Dictionary, r: { plan_id: string | null; trial_days: number | null; stripe_coupon_id: string | null }) {
  const c = t.staff.access.codes;
  return [r.plan_id ? `${c.plan}: ${r.plan_id}` : null, r.trial_days !== null ? `${c.trialDays}: ${r.trial_days}` : null, r.stripe_coupon_id ? `${c.coupon}: ${r.stripe_coupon_id}` : null].filter(Boolean).join(" · ");
}
