"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/dashboard/context";
import { changeRole, inviteMember, removeMember, resendInvite, revokeInvite, type TeamError } from "@/lib/team/team";

export type TeamResult = { ok: true; mailed?: boolean } | { ok: false; error: TeamError };

const refresh = () => revalidatePath("/p/[locale]/dashboard/team", "page");

async function actor(min: "admin" | "redeemer" = "admin") {
  const { tenant, user } = await requireTenant(min);
  return { tenantId: tenant.id, actor: { id: user.id, role: tenant.role, name: user.name ?? "" } };
}

export async function invite(input: { email: string; name: string; role: string }): Promise<TeamResult> {
  const { tenantId, actor: a } = await actor();
  const r = await inviteMember(tenantId, a, input);
  refresh();
  return r;
}

export async function resend(inviteId: string): Promise<TeamResult> {
  const { tenantId, actor: a } = await actor();
  const r = await resendInvite(tenantId, a, inviteId);
  refresh();
  return r.ok ? { ok: true, mailed: true } : { ok: false, error: r.error ?? "failed" };
}

export async function revoke(inviteId: string): Promise<TeamResult> {
  const { tenantId, actor: a } = await actor();
  const r = await revokeInvite(tenantId, a, inviteId);
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "failed" };
}

export async function setRole(userId: string, role: string): Promise<TeamResult> {
  const { tenantId, actor: a } = await actor();
  const r = await changeRole(tenantId, a, userId, role);
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "failed" };
}

/** Remove a member; anyone may leave a team themselves (not as the last owner). */
export async function remove(userId: string): Promise<TeamResult> {
  const { tenantId, actor: a } = await actor("redeemer");
  const r = await removeMember(tenantId, a, userId);
  if (!r.ok) return { ok: false, error: r.error ?? "failed" };
  if (userId === a.id) redirect("/dashboard");
  refresh();
  return { ok: true };
}
