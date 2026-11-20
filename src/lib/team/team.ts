import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { brandOf } from "@/lib/mail/deliver";
import { sendMail } from "@/lib/mail/mailgun";
import { loadSender } from "@/lib/mail/sender-load";
import { teamInviteMail } from "@/lib/mail/templates";
import { getShopProfile } from "@/lib/shop/queries";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { canChangeRole, canInvite, canRemove, isTeamRole, seatsLeft, validEmail, type TeamRole } from "./rules";

/**
 * Team of a shop (server, service role after the caller's role check in the action): members
 * and open invitations. Invitations carry a random token (only its hash is stored) and lead to
 * sellycat.com/invite/<token>; a new address gets an account without password, set on accepting.
 */
export type TeamMember = { userId: string; name: string; email: string; role: TeamRole; since: string; lastSignIn: string | null };
export type TeamInvite = { id: string; email: string; name: string | null; role: TeamRole; expiresAt: string; createdAt: string };
export type TeamError = "invalid" | "forbidden" | "seats" | "exists" | "last_owner" | "failed";

const INVITE_DAYS = 14;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const apexUrl = () => {
  const root = siteHost() || DEFAULT_ROOT;
  return `${root.startsWith("localhost") ? "http" : "https"}://${root}`;
};

export async function loadTeam(tenantId: string): Promise<{ members: TeamMember[]; invites: TeamInvite[]; seatLimit: number | null; seatsUsed: number }> {
  const db = createAdminClient();
  const [{ data: rows }, { data: invites }, { data: limit }, { data: used }] = await Promise.all([
    db.from("tenant_members").select("user_id, role, created_at").eq("tenant_id", tenantId).in("role", ["owner", "admin", "editor", "redeemer"]).order("created_at"),
    db.from("tenant_invites").select("id, email, name, role, expires_at, created_at").eq("tenant_id", tenantId).is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at"),
    db.rpc("plan_limit", { p_tenant: tenantId, p_key: "seats" }),
    db.rpc("team_seats_used", { p_tenant: tenantId }),
  ]);
  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: profiles } = ids.length ? await db.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
  const members: TeamMember[] = [];
  for (const r of rows ?? []) {
    const { data: u } = await db.auth.admin.getUserById(r.user_id);
    members.push({ userId: r.user_id, name: profiles?.find((p) => p.user_id === r.user_id)?.full_name ?? "", email: u.user?.email ?? "", role: r.role as TeamRole, since: r.created_at, lastSignIn: u.user?.last_sign_in_at ?? null });
  }
  return {
    members,
    invites: (invites ?? []).map((i) => ({ id: i.id, email: String(i.email), name: i.name, role: i.role as TeamRole, expiresAt: i.expires_at, createdAt: i.created_at })),
    seatLimit: typeof limit === "number" ? limit : null,
    seatsUsed: typeof used === "number" ? used : 0,
  };
}

async function sendInvite(tenantId: string, invite: { email: string; name: string | null; role: TeamRole }, token: string, inviter: string): Promise<boolean> {
  const shop = await getShopProfile(tenantId);
  if (!shop) return false;
  const sender = await loadSender(tenantId);
  const mail = teamInviteMail({ brand: brandOf(shop), name: invite.name ?? "", inviter, role: invite.role, url: `${apexUrl()}/invite/${token}`, days: INVITE_DAYS });
  const sent = await sendMail({ domain: sender.domain, from: sender.from, replyTo: sender.replyTo, to: invite.email, ...mail, tag: "team-invite" });
  return sent.ok;
}

/** Invite (or re-invite) an address with a role; checks rights, seats and existing membership. */
export async function inviteMember(
  tenantId: string,
  actor: { id: string; role: string; name: string },
  input: { email: string; name: string; role: string },
): Promise<{ ok: true; mailed: boolean } | { ok: false; error: TeamError }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 120) || null;
  if (!validEmail(email) || !isTeamRole(input.role)) return { ok: false, error: "invalid" };
  if (!canInvite(actor.role, input.role)) return { ok: false, error: "forbidden" };
  const db = createAdminClient();

  const { data: userId } = await db.rpc("auth_user_id", { p_email: email });
  if (userId) {
    const { data: member } = await db.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (member && member.role !== "partner") return { ok: false, error: "exists" };
  }
  const { data: open } = await db.from("tenant_invites").select("id").eq("tenant_id", tenantId).eq("email", email).is("accepted_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!open) {
    const [{ data: limit }, { data: used }] = await Promise.all([db.rpc("plan_limit", { p_tenant: tenantId, p_key: "seats" }), db.rpc("team_seats_used", { p_tenant: tenantId })]);
    if (seatsLeft(typeof limit === "number" ? limit : null, typeof used === "number" ? used : 0) < 1) return { ok: false, error: "seats" };
  }
  // A new address gets its account now (no password; set when accepting).
  if (!userId) {
    const { error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: name ? { full_name: name } : {} });
    if (error && !/already/i.test(error.message)) return { ok: false, error: "failed" };
  }
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
  const { error } = await db
    .from("tenant_invites")
    .upsert({ tenant_id: tenantId, email, name, role: input.role, invited_by: actor.id, token_hash: hashToken(token), expires_at: expires, accepted_at: null, accepted_by: null }, { onConflict: "tenant_id,email" });
  if (error) return { ok: false, error: "failed" };
  const mailed = await sendInvite(tenantId, { email, name, role: input.role }, token, actor.name);
  return { ok: true, mailed };
}

/** New link and a fresh 14 days for an open invitation (the old link stops working). */
export async function resendInvite(tenantId: string, actor: { id: string; role: string; name: string }, inviteId: string): Promise<{ ok: boolean; error?: TeamError }> {
  const db = createAdminClient();
  const { data: inv } = await db.from("tenant_invites").select("email, name, role").eq("id", inviteId).eq("tenant_id", tenantId).is("accepted_at", null).maybeSingle();
  if (!inv || !isTeamRole(inv.role)) return { ok: false, error: "invalid" };
  if (!canInvite(actor.role, inv.role)) return { ok: false, error: "forbidden" };
  const token = randomBytes(32).toString("base64url");
  const { error } = await db.from("tenant_invites").update({ token_hash: hashToken(token), expires_at: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString() }).eq("id", inviteId);
  if (error) return { ok: false, error: "failed" };
  return { ok: await sendInvite(tenantId, { email: String(inv.email), name: inv.name, role: inv.role }, token, actor.name) };
}

export async function revokeInvite(tenantId: string, actor: { role: string }, inviteId: string): Promise<{ ok: boolean; error?: TeamError }> {
  const db = createAdminClient();
  const { data: inv } = await db.from("tenant_invites").select("role").eq("id", inviteId).eq("tenant_id", tenantId).maybeSingle();
  if (!inv || !isTeamRole(inv.role)) return { ok: false, error: "invalid" };
  if (!canInvite(actor.role, inv.role)) return { ok: false, error: "forbidden" };
  const { error } = await db.from("tenant_invites").delete().eq("id", inviteId).eq("tenant_id", tenantId);
  return error ? { ok: false, error: "failed" } : { ok: true };
}

async function ownerCount(tenantId: string) {
  const { count } = await createAdminClient().from("tenant_members").select("user_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role", "owner");
  return count ?? 0;
}

export async function changeRole(tenantId: string, actor: { id: string; role: string }, userId: string, to: string): Promise<{ ok: boolean; error?: TeamError }> {
  if (!isTeamRole(to)) return { ok: false, error: "invalid" };
  const db = createAdminClient();
  const { data: m } = await db.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
  if (!m || !isTeamRole(m.role)) return { ok: false, error: "invalid" };
  const owners = await ownerCount(tenantId);
  if (!canChangeRole({ actor: actor.role, actorId: actor.id, targetId: userId, from: m.role, to, owners })) return { ok: false, error: m.role === "owner" && owners <= 1 ? "last_owner" : "forbidden" };
  const { error } = await db.from("tenant_members").update({ role: to }).eq("tenant_id", tenantId).eq("user_id", userId);
  return error ? { ok: false, error: "failed" } : { ok: true };
}

export async function removeMember(tenantId: string, actor: { id: string; role: string }, userId: string): Promise<{ ok: boolean; error?: TeamError }> {
  const db = createAdminClient();
  const { data: m } = await db.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
  if (!m || !isTeamRole(m.role)) return { ok: false, error: "invalid" };
  const owners = await ownerCount(tenantId);
  if (!canRemove({ actor: actor.role, actorId: actor.id, targetId: userId, role: m.role, owners })) return { ok: false, error: m.role === "owner" && owners <= 1 ? "last_owner" : "forbidden" };
  const { error } = await db.from("tenant_members").delete().eq("tenant_id", tenantId).eq("user_id", userId);
  return error ? { ok: false, error: "failed" } : { ok: true };
}
