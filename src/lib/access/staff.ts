import "server-only";
import { platformMailDomain, sendMail } from "@/lib/mail/mailgun";
import { platformBrand, waitlistInviteMail } from "@/lib/mail/templates";
import { apexUrl } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { codeLink, generateCode, isValidCode, normaliseCode } from "./rules";
import { mailFrom, replyTo } from "./server";

/**
 * Staff side of signup access (callers check requireStaff first): creating and editing codes,
 * inviting from the waitlist (personal code + mail, rolled back if the mail fails) and the
 * daily reminder. Only the service role writes these tables.
 */

type CodeInsert = Database["public"]["Tables"]["invite_codes"]["Insert"];
export type CodePerks = { maxUses: number | null; expiresAt: string | null; planId: string | null; trialDays: number | null; couponId: string | null; tag: string | null; note: string | null };

const perksRow = (p: CodePerks) => ({
  max_uses: p.maxUses,
  expires_at: p.expiresAt,
  plan_id: p.planId,
  trial_days: p.trialDays,
  stripe_coupon_id: p.couponId,
  tag: p.tag,
  note: p.note,
});

/** One custom code, or `count` generated ones (optional prefix). Returns the created codes. */
export async function createCodes(i: { custom: string | null; count: number; prefix: string; perks: CodePerks; staffId: string }): Promise<{ ok: true; codes: string[] } | { ok: false; error: "invalid" | "taken" }> {
  const db = createAdminClient();
  if (i.custom !== null) {
    const code = normaliseCode(i.custom);
    if (!isValidCode(code)) return { ok: false, error: "invalid" };
    const { error } = await db.from("invite_codes").insert({ code, ...perksRow(i.perks), created_by: i.staffId });
    if (error) return { ok: false, error: error.code === "23505" ? "taken" : "invalid" };
    return { ok: true, codes: [code] };
  }
  const count = Math.min(Math.max(1, Math.floor(i.count)), 500);
  const created: string[] = [];
  // Collisions are astronomically rare at ~2^50; a few rounds retry the odd one.
  for (let round = 0; round < 3 && created.length < count; round++) {
    const rows: CodeInsert[] = Array.from({ length: count - created.length }, () => ({ code: generateCode(i.prefix), ...perksRow(i.perks), created_by: i.staffId }));
    const { data } = await db.from("invite_codes").upsert(rows, { onConflict: "code", ignoreDuplicates: true }).select("code");
    created.push(...(data ?? []).map((r) => r.code));
  }
  return { ok: true, codes: created };
}

export async function updateCode(id: string, p: CodePerks & { active: boolean }) {
  const db = createAdminClient();
  const { data: cur } = await db.from("invite_codes").select("uses, disabled_at").eq("id", id).maybeSingle();
  if (!cur) return { ok: false as const, error: "invalid" as const };
  // max_uses below the current count would break the database check: never lower than used.
  const maxUses = p.maxUses === null ? null : Math.max(p.maxUses, cur.uses, 1);
  const { error } = await db
    .from("invite_codes")
    .update({ ...perksRow({ ...p, maxUses }), disabled_at: p.active ? null : (cur.disabled_at ?? new Date().toISOString()) })
    .eq("id", id);
  return error ? { ok: false as const, error: "invalid" as const } : { ok: true as const };
}

// ---------------------------------------------------------------- waitlist

export type InviteOptions = { planId: string | null; trialDays: number | null; couponId: string | null; expiresDays: number | null };
export type InviteResult = { invited: number; skipped: number; failed: number };

/**
 * Invites confirmed entries: a personal one-time code (bound to the address), the mail, then the
 * status. Re-inviting disables the previous unused code. A failed mail removes the new code.
 */
export async function inviteFromWaitlist(ids: string[], opts: InviteOptions, staffId: string): Promise<InviteResult> {
  const db = createAdminClient();
  const { data: rows } = await db.from("waitlist").select("id, email, name, locale, status, confirmed_at, invite_code_id").in("id", ids.slice(0, 200));
  const result: InviteResult = { invited: 0, skipped: 0, failed: 0 };
  const site = apexUrl();
  const expiresAt = opts.expiresDays ? new Date(Date.now() + opts.expiresDays * 86_400_000).toISOString() : null;
  for (const row of rows ?? []) {
    if (!row.confirmed_at || row.status === "registered") {
      result.skipped++;
      continue;
    }
    const { data: code } = await db
      .from("invite_codes")
      .insert({ code: generateCode(), max_uses: 1, expires_at: expiresAt, plan_id: opts.planId, trial_days: opts.trialDays, stripe_coupon_id: opts.couponId, tag: "waitlist", note: row.email, waitlist_id: row.id, created_by: staffId })
      .select("id, code")
      .single();
    if (!code) {
      result.failed++;
      continue;
    }
    const locale = row.locale === "en" ? "en" : "de";
    const mail = waitlistInviteMail({ brand: platformBrand(locale, site), name: row.name, code: code.code, url: codeLink(site, code.code), expiresAt });
    const sent = await sendMail({ domain: platformMailDomain(), from: mailFrom(), to: row.email, replyTo: replyTo(), subject: mail.subject, html: mail.html, text: mail.text, tag: "waitlist-invite" });
    if (!sent.ok) {
      console.error("[waitlist] invite mail", sent.error);
      await db.from("invite_codes").delete().eq("id", code.id);
      result.failed++;
      continue;
    }
    if (row.invite_code_id) await db.from("invite_codes").update({ disabled_at: new Date().toISOString() }).eq("id", row.invite_code_id).eq("uses", 0).is("disabled_at", null);
    await db.from("waitlist").update({ status: "invited", invited_at: new Date().toISOString(), invite_code_id: code.id, reminded_at: null }).eq("id", row.id);
    result.invited++;
  }
  return result;
}

/** Daily (cron): one reminder per invitation after the configured days, while the code is unused and valid. */
export async function sendInviteReminders(): Promise<{ reminded: number }> {
  const db = createAdminClient();
  const { data: settings } = await db.from("platform_settings").select("invite_reminder_days").maybeSingle();
  const days = settings?.invite_reminder_days ?? 0;
  if (days <= 0) return { reminded: 0 };
  const before = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: rows } = await db
    .from("waitlist")
    .select("id, email, name, locale, invite_code_id, invite_codes!waitlist_invite_code_id_fkey(code, uses, expires_at, disabled_at)")
    .eq("status", "invited")
    .is("reminded_at", null)
    .lt("invited_at", before)
    .limit(200);
  const site = apexUrl();
  let reminded = 0;
  for (const row of rows ?? []) {
    const c = row.invite_codes;
    if (!c || c.uses > 0 || c.disabled_at || (c.expires_at && Date.parse(c.expires_at) <= Date.now())) continue;
    const locale = row.locale === "en" ? "en" : "de";
    const mail = waitlistInviteMail({ brand: platformBrand(locale, site), name: row.name, code: c.code, url: codeLink(site, c.code), expiresAt: c.expires_at, reminder: true });
    const sent = await sendMail({ domain: platformMailDomain(), from: mailFrom(), to: row.email, replyTo: replyTo(), subject: mail.subject, html: mail.html, text: mail.text, tag: "waitlist-reminder" });
    if (!sent.ok) continue;
    await db.from("waitlist").update({ reminded_at: new Date().toISOString() }).eq("id", row.id);
    reminded++;
  }
  return { reminded };
}

/** Search text for PostgREST `or()` filters: no syntax characters, bounded length. */
export const searchTerm = (q: string) => q.replace(/[,()*%\\:"']/g, " ").trim().slice(0, 80);
