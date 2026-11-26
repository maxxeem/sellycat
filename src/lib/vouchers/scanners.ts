import "server-only";
import { brandOf, shopBase } from "@/lib/mail/deliver";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { scannerInviteMail } from "@/lib/mail/templates";
import { invitesAllowed } from "@/lib/team/team";
import { getShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePartnerCode, normalizePartnerCode, validPartnerCode } from "./partner-code-rules";

/**
 * Authorised scanners of a partner: people who may sign in on the shop's /scan with a code by
 * email and redeem this partner's vouchers (tenant members with role 'partner'). Service role;
 * callers check that the person managing them is owner or admin of the shop.
 */
export type Scanner = { userId: string; name: string; email: string; since: string };
export type ScannerError = "invalid" | "team" | "other_partner" | "exists" | "code_mode" | "failed";

const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;

export async function listScanners(tenantId: string, partnerId: string): Promise<Scanner[]> {
  const db = createAdminClient();
  const { data } = await db.from("tenant_members").select("user_id, created_at").eq("tenant_id", tenantId).eq("role", "partner").eq("partner_id", partnerId).order("created_at");
  if (!data?.length) return [];
  const { data: profiles } = await db.from("profiles").select("user_id, full_name").in("user_id", data.map((m) => m.user_id));
  const out: Scanner[] = [];
  for (const m of data) {
    const { data: u } = await db.auth.admin.getUserById(m.user_id);
    out.push({ userId: m.user_id, name: profiles?.find((p) => p.user_id === m.user_id)?.full_name ?? "", email: u.user?.email ?? "", since: m.created_at });
  }
  return out;
}

export async function inviteScanner(tenantId: string, partnerId: string, rawName: string, rawEmail: string): Promise<{ ok: true; mailed: boolean } | { ok: false; error: ScannerError }> {
  const name = rawName.trim().slice(0, 120);
  const email = rawEmail.trim().toLowerCase();
  if (!name || !validEmail(email)) return { ok: false, error: "invalid" };
  if (!(await invitesAllowed(tenantId, email))) return { ok: false, error: "failed" };
  const db = createAdminClient();
  const { data: partner } = await db.from("partners").select("id, name").eq("id", partnerId).eq("tenant_id", tenantId).maybeSingle();
  if (!partner) return { ok: false, error: "invalid" };
  // Either scanners or a code: while the partner has a code, nobody is invited.
  if ((await partnerCode(tenantId, partnerId)).active) return { ok: false, error: "code_mode" };

  // The account behind the email: existing, or created now (no password: sign-in by code only).
  let { data: userId } = await db.rpc("auth_user_id", { p_email: email });
  if (!userId) {
    const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !created.user) return { ok: false, error: "failed" };
    userId = created.user.id;
  }
  const { data: member } = await db.from("tenant_members").select("role, partner_id").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
  if (member && member.role !== "partner") return { ok: false, error: "team" };
  if (member && member.partner_id !== partnerId) return { ok: false, error: "other_partner" };
  if (member) return { ok: false, error: "exists" };
  const { error } = await db.from("tenant_members").insert({ tenant_id: tenantId, user_id: userId, role: "partner", partner_id: partnerId });
  if (error) return { ok: false, error: "failed" };
  const { data: profile } = await db.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
  if (!profile?.full_name) await db.from("profiles").upsert({ user_id: userId, full_name: name }, { onConflict: "user_id" });

  const shop = await getShopProfile(tenantId);
  if (!shop) return { ok: true, mailed: false };
  const sender = await loadSender(tenantId);
  const mail = scannerInviteMail({ brand: brandOf(shop, sender), name, partner: partner.name, url: `${shopBase(shop)}/scan` });
  const sent = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: email, ...mail, tag: "scanner-invite" });
  return { ok: true, mailed: sent.ok };
}

/** Takes the right away (the account itself stays: it may belong to other shops). */
export async function removeScanner(tenantId: string, partnerId: string, userId: string): Promise<boolean> {
  const { error } = await createAdminClient().from("tenant_members").delete().eq("tenant_id", tenantId).eq("user_id", userId).eq("role", "partner").eq("partner_id", partnerId);
  return !error;
}

/**
 * Partner code (instead of scanners): anyone at the partner enters it on the phone and can redeem
 * that partner's vouchers. Stored only as a hash (shown once when set); setting it removes the
 * scanners and ends every session of the partner, clearing it goes back to scanners.
 */
export type PartnerCode = { active: boolean; since: string | null };
export type PartnerCodeError = "invalid" | "taken" | "failed";

export async function partnerCode(tenantId: string, partnerId: string): Promise<PartnerCode> {
  const { data } = await createAdminClient().from("partner_scan_codes").select("set_at").eq("tenant_id", tenantId).eq("partner_id", partnerId).maybeSingle();
  return { active: Boolean(data), since: data?.set_at ?? null };
}

/** Does any partner of the shop use a code? (Then the app's sign-in offers the code field.) */
export async function shopUsesPartnerCodes(tenantId: string): Promise<boolean> {
  const { count } = await createAdminClient().from("partner_scan_codes").select("partner_id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  return (count ?? 0) > 0;
}

/** Sets the typed code, or a new one when `raw` is empty; returns the code to show once. */
export async function setPartnerCode(tenantId: string, partnerId: string, raw: string): Promise<{ ok: true; code: string } | { ok: false; error: PartnerCodeError }> {
  const db = createAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = raw.trim() ? normalizePartnerCode(raw) : generatePartnerCode();
    if (!validPartnerCode(code)) return { ok: false, error: "invalid" };
    const { data, error } = await db.rpc("partner_code_set", { p_tenant: tenantId, p_partner: partnerId, p_code: code });
    if (error || data === "not_found") return { ok: false, error: "failed" };
    if (data === "ok") return { ok: true, code };
    if (data === "invalid") return { ok: false, error: "invalid" };
    // Taken by another partner: a typed code is refused, a generated one is drawn again.
    if (raw.trim()) return { ok: false, error: "taken" };
  }
  return { ok: false, error: "failed" };
}

export async function clearPartnerCode(tenantId: string, partnerId: string): Promise<boolean> {
  const { error } = await createAdminClient().rpc("partner_code_clear", { p_tenant: tenantId, p_partner: partnerId });
  return !error;
}
