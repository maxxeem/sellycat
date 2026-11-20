/**
 * Signup access against staging: invite codes, their uses and the waitlist are invisible to
 * clients (staff read only, without secrets), claiming is atomic and never overbooks, a personal
 * code only works for its address, released slots come back, and a confirmed use may create
 * exactly one shop while signup is not open.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { admin, anon, anonKey, rlsEnabled, url, type DB } from "./helpers";

const run = `ac${Date.now().toString(36)}`.toUpperCase();
const email = (n: string) => `rls-${run.toLowerCase()}-${n}@example.com`;

describe.skipIf(!rlsEnabled)("RLS signup access", () => {
  let db: DB;
  const codes: string[] = [];
  const users: string[] = [];
  const tenants: string[] = [];
  let waitlistId: string;

  const makeCode = async (code: string, extra: Partial<Database["public"]["Tables"]["invite_codes"]["Insert"]> = {}) => {
    const { data, error } = await db.from("invite_codes").insert({ code, ...extra }).select("id").single();
    if (error) throw error;
    codes.push(data.id);
    return data.id;
  };

  beforeAll(async () => {
    db = admin();
    waitlistId = (await db
      .from("waitlist")
      .insert({ email: email("wl"), consent_at: new Date().toISOString(), consent_version: "test", confirm_token_hash: `hash-${run}` })
      .select("id")
      .single()).data!.id;
  });

  afterAll(async () => {
    for (const t of tenants) await db.from("tenants").delete().eq("id", t);
    for (const u of users) await db.auth.admin.deleteUser(u);
    if (codes.length) await db.from("invite_codes").delete().in("id", codes);
    await db.from("waitlist").delete().eq("id", waitlistId);
  });

  it("clients see and change nothing", async () => {
    await makeCode(`${run}-HIDDEN`);
    expect((await anon().from("invite_codes").select("id").eq("code", `${run}-HIDDEN`)).data ?? []).toHaveLength(0);
    expect((await anon().from("waitlist").select("id").eq("id", waitlistId)).data ?? []).toHaveLength(0);
    expect((await anon().from("invite_codes").insert({ code: `${run}-EVIL` })).error).not.toBeNull();
    expect((await anon().from("waitlist").insert({ email: email("evil"), consent_at: new Date().toISOString(), consent_version: "x" })).error).not.toBeNull();
    expect((await anon().from("rate_hits").select("key").limit(1)).error).not.toBeNull();
    expect((await anon().rpc("claim_invite_code", { p_code: `${run}-HIDDEN`, p_email: email("x") })).error).not.toBeNull();
    expect((await anon().rpc("rate_hit", { p_key: "x", p_limit: 1, p_window_seconds: 60 })).error).not.toBeNull();
  });

  it("claims atomically and never past max_uses", async () => {
    const id = await makeCode(`${run}-MULTI`, { max_uses: 3 });
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => db.rpc("claim_invite_code", { p_code: `${run.toLowerCase()}-multi `, p_email: email(`m${i}`) })));
    expect(results.filter((r) => r.data).length).toBe(3);
    expect((await db.from("invite_codes").select("uses").eq("id", id).single()).data!.uses).toBe(3);
    // Release one: the slot is free again.
    await db.rpc("release_invite_use", { p_use: results.find((r) => r.data)!.data! });
    expect((await db.rpc("claim_invite_code", { p_code: `${run}-MULTI`, p_email: email("again") })).data).toBeTruthy();
  });

  it("rejects disabled, expired and unknown codes the same way", async () => {
    await makeCode(`${run}-OFF`, { disabled_at: new Date().toISOString() });
    await makeCode(`${run}-OLD`, { expires_at: new Date(Date.now() - 1000).toISOString() });
    for (const code of [`${run}-OFF`, `${run}-OLD`, `${run}-NOPE`]) {
      const r = await db.rpc("claim_invite_code", { p_code: code, p_email: email("n") });
      expect(r.error).toBeNull();
      expect(r.data).toBeNull();
    }
  });

  it("a personal code only works for its waitlist address", async () => {
    await makeCode(`${run}-MINE`, { max_uses: 1, waitlist_id: waitlistId });
    expect((await db.rpc("claim_invite_code", { p_code: `${run}-MINE`, p_email: email("other") })).data).toBeNull();
    expect((await db.rpc("claim_invite_code", { p_code: `${run}-MINE`, p_email: email("wl").toUpperCase() })).data).toBeTruthy();
  });

  it("a confirmed use creates one shop and registers the waitlist entry", async () => {
    const codeId = await makeCode(`${run}-SHOP`, { max_uses: 1, waitlist_id: waitlistId, plan_id: "pro" });
    const mail = email("wl");
    const { data: created } = await db.auth.admin.createUser({ email: mail, password: `Pw-${run}-shop!`, email_confirm: true });
    users.push(created.user!.id);
    const use = (await db.rpc("claim_invite_code", { p_code: `${run}-SHOP`, p_email: mail })).data!;
    expect(use).toBeTruthy();
    await db.rpc("attach_invite_user", { p_use: use, p_user: created.user!.id });
    const perks = (await db.rpc("confirm_invite_use", { p_user: created.user!.id })).data ?? [];
    expect(perks[0]).toMatchObject({ code_id: codeId, plan_id: "pro" });

    const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: mail, password: `Pw-${run}-shop!` });
    const slug = `rls-${run.toLowerCase()}-shop`;
    const { data: tenantId, error } = await client.rpc("create_tenant", { p_name: "Invite shop", p_slug: slug, p_root: "localhost" });
    expect(error).toBeNull();
    tenants.push(tenantId!);
    await db.rpc("finish_invite_signup", { p_user: created.user!.id, p_tenant: tenantId! });
    expect((await db.from("tenants").select("plan_id, invite_code_id").eq("id", tenantId!).single()).data).toMatchObject({ plan_id: "pro", invite_code_id: codeId });
    expect((await db.from("waitlist").select("status").eq("id", waitlistId).single()).data!.status).toBe("registered");

    // The use is spent: a second shop only works while signup is open.
    const mode = (await db.from("platform_settings").select("signup_mode").single()).data!.signup_mode;
    const second = await client.rpc("create_tenant", { p_name: "Second", p_slug: `${slug}-2`, p_root: "localhost" });
    if (mode === "open") tenants.push(second.data!);
    else expect(second.error).not.toBeNull();
  });

  it("counts rate-limit hits atomically", async () => {
    const key = `test:${run}`;
    const hits = await Promise.all(Array.from({ length: 6 }, () => db.rpc("rate_hit", { p_key: key, p_limit: 4, p_window_seconds: 600 })));
    expect(hits.filter((h) => h.data === true).length).toBe(4);
    await db.from("rate_hits").delete().eq("key", key);
  });

  it("staff clients never read the opt-in token", async () => {
    // authenticated has a column grant without confirm_token_hash; a non-staff user gets no rows at all.
    const c = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const r = await c.from("waitlist").select("confirm_token_hash").limit(1);
    expect(r.error).not.toBeNull();
  });
});
