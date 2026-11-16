import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";

export type PlatformRole = Database["public"]["Enums"]["platform_role"];
export type StaffUser = SessionUser & { role: PlatformRole };

export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await createAdminClient().from("platform_staff").select("role").eq("user_id", user.id).maybeSingle();
  return data ? { ...user, role: data.role } : null;
});

/**
 * Every staff page and action: 404 for everyone else (no hint that the admin exists) and a
 * verified authenticator code in this session (AAL2), except on the MFA page itself.
 */
export async function requireStaff(options: { mfa?: boolean; role?: PlatformRole } = {}): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) notFound();
  if (options.role === "superadmin" && staff.role !== "superadmin") notFound();
  if (options.mfa !== false && staff.aal !== "aal2" && !serverEnv.staffMfaOptional) redirect("/admin/mfa");
  return staff;
}

/** True while the visible path is the MFA page (the layout must not redirect there in a loop). */
export async function onMfaPage(): Promise<boolean> {
  return ((await headers()).get("x-sc-path") ?? "").startsWith("/admin/mfa");
}

export async function audit(actorId: string, action: string, target: { tenantId?: string | null; type?: string; id?: string; meta?: Json } = {}) {
  await createAdminClient()
    .from("platform_audit_log")
    .insert({ actor_id: actorId, action, tenant_id: target.tenantId ?? null, target_type: target.type ?? null, target_id: target.id ?? null, meta: target.meta ?? {} });
}
