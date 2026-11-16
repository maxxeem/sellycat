/**
 * Cross-tenant isolation against the real staging database (RLS). Skipped without credentials.
 * Creates two throw-away tenants with one owner each and proves that neither can see or change
 * the other's data, that customers cannot touch staff-only fields, and that anon sees nothing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const enabled = Boolean(url && anonKey && secret) && !url?.includes("<project-ref>");
const isProduction = Boolean(process.env.SUPABASE_PRODUCTION_REF && url?.includes(process.env.SUPABASE_PRODUCTION_REF));

type DB = SupabaseClient<Database>;
const run = Date.now().toString(36);

describe.skipIf(!enabled || isProduction)("RLS tenant isolation", () => {
  let admin: DB;
  const users: Array<{ id: string; email: string; client: DB; tenantId: string }> = [];

  beforeAll(async () => {
    admin = createClient<Database>(url!, secret!, { auth: { persistSession: false } });
    for (const n of [1, 2]) {
      const email = `rls-${run}-${n}@example.com`;
      const password = `Rls-${run}-pw-${n}!`;
      const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !created.user) throw error;
      const { data: tenant } = await admin.from("tenants").insert({ name: `RLS ${run} ${n}`, slug: `rls-${run}-${n}` }).select("id").single();
      await admin.from("tenant_members").insert({ tenant_id: tenant!.id, user_id: created.user.id, role: "owner" });
      await admin.from("tenant_domains").insert({ tenant_id: tenant!.id, hostname: `rls-${run}-${n}.test`, kind: "subdomain", status: "active", is_primary: true });
      const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      users.push({ id: created.user.id, email, client, tenantId: tenant!.id });
    }
  });

  afterAll(async () => {
    if (!admin) return;
    for (const u of users) {
      await admin.from("tenants").delete().eq("id", u.tenantId);
      await admin.auth.admin.deleteUser(u.id);
    }
  });

  it("each owner sees only their own tenant", async () => {
    const [a, b] = users;
    const { data } = await a.client.from("tenants").select("id");
    expect(data?.map((r) => r.id)).toEqual([a.tenantId]);
    const { data: other } = await a.client.from("tenants").select("id").eq("id", b.tenantId);
    expect(other).toEqual([]);
  });

  it("members, domains and invites of another tenant are invisible", async () => {
    const [a, b] = users;
    for (const table of ["tenant_members", "tenant_domains", "tenant_invites"] as const) {
      const { data } = await a.client.from(table).select("tenant_id").eq("tenant_id", b.tenantId);
      expect(data, table).toEqual([]);
    }
  });

  it("an owner cannot update another tenant", async () => {
    const [a, b] = users;
    await a.client.from("tenants").update({ name: "hacked" }).eq("id", b.tenantId);
    const { data } = await admin.from("tenants").select("name").eq("id", b.tenantId).single();
    expect(data?.name).not.toBe("hacked");
  });

  it("an owner can rename their tenant but not change plan, status or fee", async () => {
    const [a] = users;
    const ok = await a.client.from("tenants").update({ name: `RLS ${run} renamed` }).eq("id", a.tenantId);
    expect(ok.error).toBeNull();
    const plan = await a.client.from("tenants").update({ plan_id: "pro" }).eq("id", a.tenantId);
    expect(plan.error).not.toBeNull();
    const fee = await a.client.from("tenants").update({ fee_override_bps: 0 }).eq("id", a.tenantId);
    expect(fee.error).not.toBeNull();
  });

  it("customers cannot add themselves to another tenant or make themselves staff", async () => {
    const [a, b] = users;
    const join = await a.client.from("tenant_members").insert({ tenant_id: b.tenantId, user_id: a.id, role: "owner" });
    expect(join.error).not.toBeNull();
    const staff = await a.client.from("platform_staff").insert({ user_id: a.id, role: "superadmin" });
    expect(staff.error).not.toBeNull();
    const { data: isStaff } = await a.client.rpc("is_staff");
    expect(isStaff).toBe(false);
  });

  it("customers cannot open signup or read the audit log", async () => {
    const [a] = users;
    await a.client.from("platform_settings").update({ signup_mode: "open" }).eq("id", true);
    const { data } = await admin.from("platform_settings").select("signup_mode").single();
    expect(data?.signup_mode).toBe("paused");
    const { data: log } = await a.client.from("platform_audit_log").select("id").limit(1);
    expect(log).toEqual([]);
  });

  it("create_tenant is refused while signup is paused", async () => {
    const [a] = users;
    const { error } = await a.client.rpc("create_tenant", { p_name: "x", p_slug: `rls-${run}-x`, p_root: "test" });
    expect(error?.message).toContain("signup paused");
  });

  it("anon sees no tenant data, only the public shop lookup", async () => {
    const anon = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const { data } = await anon.from("tenants").select("id");
    expect(data).toEqual([]);
    const { data: shop } = await anon.rpc("resolve_shop", { p_slug: `rls-${run}-1` });
    expect(shop?.[0]?.tenant_id).toBe(users[0].tenantId);
    expect(Object.keys(shop?.[0] ?? {})).not.toContain("billing");
  });
});
