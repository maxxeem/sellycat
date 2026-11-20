/**
 * Team invitations against staging: the preview shows only the shop, role and a masked address;
 * only the invited address accepts, once and in time; members never add themselves; seats count
 * members plus open invitations; an existing owner is never downgraded by an invitation.
 */
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { admin, anon, anonKey, dropTenant, makeTenant, rlsEnabled, url, type DB, type TestTenant } from "./helpers";

const run = `t${Date.now().toString(36)}`;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

describe.skipIf(!rlsEnabled)("RLS team", () => {
  let db: DB;
  let a: TestTenant;
  let guest: DB;
  let guestId: string;
  const guestEmail = `guest-${run}@example.com`;

  const newInvite = async (email: string, role: "editor" | "admin" | "owner" | "redeemer", expires = new Date(Date.now() + 86_400_000)) => {
    const token = randomBytes(32).toString("base64url");
    await db.from("tenant_invites").upsert({ tenant_id: a.tenantId, email, role, token_hash: hash(token), expires_at: expires.toISOString(), accepted_at: null }, { onConflict: "tenant_id,email" });
    return token;
  };

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    await db.from("tenants").update({ plan_id: "pro" }).eq("id", a.tenantId);
    const password = `Guest-${run}-pw!`;
    const { data } = await db.auth.admin.createUser({ email: guestEmail, password, email_confirm: true });
    guestId = data.user!.id;
    guest = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    await guest.auth.signInWithPassword({ email: guestEmail, password });
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await db.auth.admin.deleteUser(guestId);
  });

  it("the preview needs the right token and masks the address", async () => {
    const token = await newInvite(guestEmail, "editor");
    const { data } = await anon().rpc("invite_preview", { p_token: token });
    expect(data?.[0]).toMatchObject({ role: "editor", open: true });
    expect(data?.[0]?.email_masked).toMatch(/^g•••@example\.com$/);
    expect((await anon().rpc("invite_preview", { p_token: `${token.slice(0, -2)}xx` })).data ?? []).toHaveLength(0);
  });

  it("seats count members and open invitations", async () => {
    expect((await db.rpc("team_seats_used", { p_tenant: a.tenantId })).data).toBe(2);
  });

  it("nobody adds themselves; another address cannot accept; the invited one joins once", async () => {
    expect((await guest.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: guestId, role: "owner" })).error).not.toBeNull();
    expect((await guest.from("tenant_invites").select("id").eq("tenant_id", a.tenantId)).data ?? []).toHaveLength(0);
    const token = await newInvite(guestEmail, "editor");
    expect((await a.client.rpc("accept_invite", { p_token: token })).error?.message).toContain("another address");
    expect((await anon().rpc("accept_invite", { p_token: token })).error).not.toBeNull();
    expect((await guest.rpc("accept_invite", { p_token: token })).data).toBe(a.tenantId);
    expect((await db.from("tenant_members").select("role").eq("tenant_id", a.tenantId).eq("user_id", guestId).single()).data?.role).toBe("editor");
    expect((await guest.rpc("accept_invite", { p_token: token })).error?.message).toContain("used");
  });

  it("expired invitations do not work", async () => {
    const token = await newInvite(guestEmail, "admin", new Date(Date.now() - 1000));
    expect((await guest.rpc("accept_invite", { p_token: token })).error?.message).toContain("expired");
    expect((await anon().rpc("invite_preview", { p_token: token })).data?.[0]).toMatchObject({ open: false, expired: true });
  });

  it("an owner accepting a lower invitation stays owner", async () => {
    const { data: me } = await a.client.auth.getUser();
    const token = await newInvite(me.user!.email!, "redeemer");
    expect((await a.client.rpc("accept_invite", { p_token: token })).data).toBe(a.tenantId);
    expect((await db.from("tenant_members").select("role").eq("tenant_id", a.tenantId).eq("user_id", a.userId).single()).data?.role).toBe("owner");
  });
});
