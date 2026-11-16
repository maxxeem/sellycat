import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type DB = SupabaseClient<Database>;

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
export const rlsEnabled = Boolean(url && anonKey && secret) && !url?.includes("<project-ref>") && !(process.env.SUPABASE_PRODUCTION_REF && url?.includes(process.env.SUPABASE_PRODUCTION_REF));

export const admin = () => createClient<Database>(url!, secret!, { auth: { persistSession: false } });
export const anon = () => createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });

export type TestTenant = { userId: string; tenantId: string; client: DB };

/** A throw-away tenant with one owner, signed in. */
export async function makeTenant(db: DB, tag: string): Promise<TestTenant> {
  const email = `rls-${tag}@example.com`;
  const password = `Rls-${tag}-pw!`;
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw error;
  const { data: tenant, error: tErr } = await db.from("tenants").insert({ name: `RLS ${tag}`, slug: `rls-${tag}`, status: "active" }).select("id").single();
  if (tErr || !tenant) throw tErr;
  await db.from("tenant_members").insert({ tenant_id: tenant.id, user_id: created.user.id, role: "owner" });
  await db.from("tenant_domains").insert({ tenant_id: tenant.id, hostname: `rls-${tag}.test`, kind: "subdomain", status: "active", is_primary: true });
  const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { userId: created.user.id, tenantId: tenant.id, client };
}

export async function dropTenant(db: DB, t: TestTenant | undefined) {
  if (!t) return;
  await db.from("tenants").delete().eq("id", t.tenantId);
  await db.auth.admin.deleteUser(t.userId);
}
