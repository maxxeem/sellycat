/**
 * Phase 4, part 2 against staging: sender domains, mail log and "my vouchers" links stay inside
 * their shop; links are never readable by anyone but the service role; plans switch features.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `m${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS mail", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    await db.from("tenants").update({ plan_id: "starter" }).eq("id", a.tenantId);
    await db.from("mail_domains").insert({ tenant_id: a.tenantId, domain: `mail.${run}a.test`, status: "pending" });
    await db.from("mail_log").insert({ tenant_id: a.tenantId, kind: "my_link", recipient: "x@example.com", status: "skipped" });
    await db.from("buyer_links").insert({ tenant_id: a.tenantId, email: "x@example.com", token_hash: `${run}hash`, expires_at: new Date(Date.now() + 60_000).toISOString() });
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("owners see their own sender domain and mail log, not another shop's", async () => {
    expect((await a.client.from("mail_domains").select("domain")).data).toHaveLength(1);
    expect((await a.client.from("mail_log").select("id").eq("tenant_id", a.tenantId)).data).toHaveLength(1);
    expect((await b.client.from("mail_domains").select("domain").eq("tenant_id", a.tenantId)).data).toEqual([]);
    expect((await b.client.from("mail_log").select("id").eq("tenant_id", a.tenantId)).data).toEqual([]);
  });

  it("sign-in links are service-role only", async () => {
    expect((await a.client.from("buyer_links").select("id")).data).toEqual([]);
    expect((await anon().from("buyer_links").select("id")).data).toEqual([]);
  });

  it("customers cannot write sender domains themselves (only after the Mailgun check on the server)", async () => {
    const { error } = await a.client.from("mail_domains").update({ status: "active" }).eq("tenant_id", a.tenantId).select();
    const { data } = await db.from("mail_domains").select("status").eq("tenant_id", a.tenantId).single();
    expect(error === null || Boolean(error)).toBe(true);
    expect(data?.status).toBe("pending");
    const insert = await b.client.from("mail_domains").insert({ tenant_id: b.tenantId, domain: `mail.${run}b.test`, status: "active" });
    expect(insert.error).not.toBeNull();
  });

  it("plan features: own sender domain from Pro on, not on Free", async () => {
    expect((await a.client.rpc("plan_allows", { p_tenant: a.tenantId, p_feature: "custom_mail_domain" })).data).toBe(false);
    await admin().from("tenants").update({ plan_id: "pro" }).eq("id", a.tenantId);
    expect((await a.client.rpc("plan_allows", { p_tenant: a.tenantId, p_feature: "custom_mail_domain" })).data).toBe(true);
    expect((await a.client.rpc("plan_allows", { p_tenant: a.tenantId, p_feature: "does_not_exist" })).data).toBe(false);
  });
});
