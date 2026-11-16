import "server-only";
import { updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getCurrentTenant, roleAtLeast, type MemberRole, type MyTenant } from "@/lib/auth/tenants";
import { createClient } from "@/lib/supabase/server";

export type TenantContext = { user: SessionUser; tenant: MyTenant; supabase: Awaited<ReturnType<typeof createClient>> };

/**
 * Every dashboard page and action: the signed-in user, the shop they work on and a client bound
 * to their session (RLS stays the last line of defence). Below the required role → 404.
 */
export async function requireTenant(min: MemberRole = "editor"): Promise<TenantContext> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/dashboard");
  if (!roleAtLeast(tenant.role, min)) notFound();
  return { user, tenant, supabase: await createClient() };
}

/** Cache tag of everything a shop renders; refreshed after every change that the shop shows. */
export const shopTag = (tenantId: string) => `shop:${tenantId}`;

export function refreshShop(tenantId: string) {
  updateTag(shopTag(tenantId));
}

/** Form values: trimmed string or null. */
export function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function int(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}
