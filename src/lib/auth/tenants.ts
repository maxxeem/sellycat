import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type MemberRole = Database["public"]["Enums"]["member_role"];
export type MyTenant = { id: string; name: string; slug: string; role: MemberRole; status: Database["public"]["Enums"]["tenant_status"] };

/** Cookie remembering which shop the dashboard shows (users can belong to several). */
export const TENANT_COOKIE = "sc_tenant";

export const getMyTenants = cache(async (): Promise<MyTenant[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_tenants");
  return (data ?? []).map((t) => ({ id: t.tenant_id, name: t.name, slug: t.slug, role: t.role, status: t.status }));
});

/** The shop the dashboard currently works on: the remembered one if still accessible, else the first. */
export const getCurrentTenant = cache(async (): Promise<MyTenant | null> => {
  const [tenants, store] = await Promise.all([getMyTenants(), cookies()]);
  const wanted = store.get(TENANT_COOKIE)?.value;
  return tenants.find((t) => t.id === wanted) ?? tenants[0] ?? null;
});

/** Role ladder for dashboard permissions (redeemer/partner only use the redemption mode). */
const RANK: Record<MemberRole, number> = { owner: 4, admin: 3, editor: 2, redeemer: 1, partner: 1 };
export const roleAtLeast = (role: MemberRole, min: MemberRole) => RANK[role] >= RANK[min];
