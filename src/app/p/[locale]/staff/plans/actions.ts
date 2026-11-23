"use server";

import { revalidatePath } from "next/cache";
import { CURRENCIES } from "@/lib/billing/currency";
import { INTERVALS, LIMIT_FLAGS, LIMIT_NUMBERS, parseAmount, parsePercent, type PlanPrices } from "@/lib/billing/plans";
import { stripeConfigured, syncPlan } from "@/lib/billing/stripe";
import { audit, requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export type PlanFormState = { ok?: boolean; error?: string; stripe?: "synced" | "skipped" | string } | null;

const text = (f: FormData, key: string, max: number) => String(f.get(key) ?? "").trim().slice(0, max);

/**
 * Saves one plan (name, visibility, prices, fee, limits, pricing-page copy) and brings Stripe in
 * line (new prices for changed amounts). Superadmins only; logged in the staff audit.
 */
export async function savePlan(planId: string, _prev: PlanFormState, form: FormData): Promise<PlanFormState> {
  const staff = await requireStaff({ role: "superadmin" });
  const admin = createAdminClient();
  const { data: before } = await admin.from("plans").select("name, prices, limits, application_fee_bps, trial_days, is_public, contact_only, marketing").eq("id", planId).maybeSingle();
  if (!before) return { error: "plan" };

  const name = text(form, "name", 40);
  if (!name) return { error: "name" };
  const feeBps = parsePercent(text(form, "fee", 10));
  if (Number.isNaN(feeBps)) return { error: "fee" };
  const trialRaw = text(form, "trial", 4);
  const trial = trialRaw === "" ? 0 : Number(trialRaw);
  if (!Number.isInteger(trial) || trial < 0 || trial > 90) return { error: "trial" };

  const prices: PlanPrices = { monthly: {}, yearly: {} };
  for (const i of INTERVALS)
    for (const c of CURRENCIES) {
      const amount = parseAmount(text(form, `price_${i}_${c}`, 12));
      if (amount === null) continue;
      if (Number.isNaN(amount)) return { error: "price" };
      prices[i][c] = amount;
    }

  const limits: Record<string, number | boolean | null> = {};
  for (const k of LIMIT_NUMBERS) {
    const raw = text(form, `limit_${k}`, 6);
    if (raw === "") limits[k] = null;
    else if (Number.isInteger(Number(raw)) && Number(raw) >= 0) limits[k] = Number(raw);
    else return { error: "limit" };
  }
  const shops = Number(text(form, "limit_shops", 3) || "1");
  if (!Number.isInteger(shops) || shops < 1 || shops > 50) return { error: "limit" };
  limits.shops = shops;
  for (const k of LIMIT_FLAGS) limits[k] = form.get(`flag_${k}`) === "on";

  const marketing = {
    de: { tagline: text(form, "tagline_de", 160), badge: text(form, "badge_de", 30) },
    en: { tagline: text(form, "tagline_en", 160), badge: text(form, "badge_en", 30) },
  };
  const after = { name, prices, limits, application_fee_bps: feeBps, trial_days: trial, is_public: form.get("public") === "on", contact_only: form.get("contact") === "on", marketing };
  const { error } = await admin.from("plans").update({ ...after, prices: prices as Json, limits: limits as Json, marketing: marketing as Json }).eq("id", planId);
  if (error) return { error: "save" };
  await audit(staff.id, "plan.update", { type: "plan", id: planId, meta: { before, after } as unknown as Json });

  let stripe: string = "skipped";
  if (stripeConfigured()) {
    const r = await syncPlan(planId);
    stripe = r.ok ? "synced" : r.error;
  }
  revalidatePath("/p/[locale]/staff/plans", "page");
  revalidatePath("/p/[locale]/pricing", "page");
  return { ok: true, stripe };
}
