"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { isSignupMode, WAITLIST_STATUSES } from "@/lib/access/rules";
import { createCodes, inviteFromWaitlist, updateCode, type CodePerks } from "@/lib/access/staff";
import { SETTINGS_TAG } from "@/lib/platform/settings";
import { audit, requireStaff } from "@/lib/platform/staff";
import { zurichLocalToIso } from "@/lib/shop/time";
import { createAdminClient } from "@/lib/supabase/admin";

/** Changes are for super-admins (like the signup switch before); support staff only read. */
const editor = () => requireStaff({ role: "superadmin" });
const refresh = () => revalidatePath("/p/[locale]/staff/access", "layout");

export async function setSignupModeAction(mode: string) {
  const staff = await editor();
  if (!isSignupMode(mode)) return;
  await createAdminClient().from("platform_settings").update({ signup_mode: mode, updated_by: staff.id }).eq("id", true);
  await audit(staff.id, "platform.signup_mode", { meta: { mode } });
  updateTag(SETTINGS_TAG);
  refresh();
}

export async function setReminderDaysAction(days: number) {
  const staff = await editor();
  const value = Math.min(60, Math.max(0, Math.floor(Number(days) || 0)));
  await createAdminClient().from("platform_settings").update({ invite_reminder_days: value, updated_by: staff.id }).eq("id", true);
  await audit(staff.id, "platform.invite_reminder_days", { meta: { days: value } });
  refresh();
}

const intOrNull = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .pipe(z.number().int().min(min).max(max).nullable());
const textOrNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

const perksSchema = z.object({
  maxUses: intOrNull(1, 1_000_000),
  expires: z
    .string()
    .trim()
    .transform((s) => zurichLocalToIso(s)),
  planId: textOrNull(32),
  trialDays: intOrNull(0, 365),
  couponId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{0,64}$/)
    .transform((s) => s || null),
  tag: textOrNull(60),
  note: textOrNull(500),
});
const perksFrom = (form: FormData): CodePerks | null => {
  const f = (k: string) => String(form.get(k) ?? "");
  const p = perksSchema.safeParse({ maxUses: f("maxUses"), expires: f("expires"), planId: f("planId"), trialDays: f("trialDays"), couponId: f("couponId"), tag: f("tag"), note: f("note") });
  return p.success ? { maxUses: p.data.maxUses, expiresAt: p.data.expires, planId: p.data.planId, trialDays: p.data.trialDays, couponId: p.data.couponId, tag: p.data.tag, note: p.data.note } : null;
};

export type CreateCodesState = { ok: true; codes: string[] } | { ok: false; error: "invalid" | "taken" } | null;

export async function createCodesAction(_: CreateCodesState, form: FormData): Promise<CreateCodesState> {
  const staff = await editor();
  const perks = perksFrom(form);
  if (!perks) return { ok: false, error: "invalid" };
  const bulk = form.get("kind") === "bulk";
  const r = await createCodes({ custom: bulk ? null : String(form.get("custom") ?? "").trim() || null, count: bulk ? Number(form.get("count")) || 1 : 1, prefix: String(form.get("prefix") ?? ""), perks, staffId: staff.id });
  if (r.ok) {
    await audit(staff.id, "invite_code.create", { meta: { count: r.codes.length, tag: perks.tag, first: r.codes[0] ?? null } });
    refresh();
  }
  return r;
}

export type SaveState = { ok: boolean } | null;

export async function updateCodeAction(id: string, _: SaveState, form: FormData): Promise<SaveState> {
  const staff = await editor();
  const perks = perksFrom(form);
  if (!perks || !z.uuid().safeParse(id).success) return { ok: false };
  const r = await updateCode(id, { ...perks, active: form.get("active") === "on" });
  if (r.ok) {
    await audit(staff.id, "invite_code.update", { type: "invite_code", id });
    refresh();
  }
  return { ok: r.ok };
}

// ---------------------------------------------------------------- waitlist

const ids = z.array(z.uuid()).min(1).max(200);

export type InviteState = { invited: number; skipped: number; failed: number } | { error: true } | null;

export async function inviteAction(_: InviteState, form: FormData): Promise<InviteState> {
  const staff = await editor();
  const list = ids.safeParse(form.getAll("id").map(String));
  const opts = z
    .object({ planId: textOrNull(32), trialDays: intOrNull(0, 365), couponId: z.string().trim().regex(/^[A-Za-z0-9_-]{0,64}$/).transform((s) => s || null), expiresDays: intOrNull(1, 365) })
    .safeParse({ planId: String(form.get("planId") ?? ""), trialDays: String(form.get("trialDays") ?? ""), couponId: String(form.get("couponId") ?? ""), expiresDays: String(form.get("expiresDays") ?? "") });
  if (!list.success || !opts.success) return { error: true };
  const r = await inviteFromWaitlist(list.data, opts.data, staff.id);
  await audit(staff.id, "waitlist.invite", { meta: { ...r, ids: list.data.length } });
  refresh();
  return r;
}

export async function setWaitlistStatusAction(idList: string[], status: string) {
  const staff = await editor();
  const list = ids.safeParse(idList);
  if (!list.success || !(WAITLIST_STATUSES as readonly string[]).includes(status)) return;
  await createAdminClient()
    .from("waitlist")
    .update({ status: status as (typeof WAITLIST_STATUSES)[number] })
    .in("id", list.data);
  await audit(staff.id, "waitlist.status", { meta: { status, count: list.data.length } });
  refresh();
}

export async function saveWaitlistNoteAction(id: string, _: SaveState, form: FormData): Promise<SaveState> {
  const staff = await editor();
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const note = String(form.get("note") ?? "").trim().slice(0, 2000) || null;
  const { error } = await createAdminClient().from("waitlist").update({ staff_note: note }).eq("id", id);
  if (!error) await audit(staff.id, "waitlist.note", { type: "waitlist", id });
  refresh();
  return { ok: !error };
}
