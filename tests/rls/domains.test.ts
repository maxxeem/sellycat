/**
 * Phase 6 against staging: shops' own domains are written by the server only, the main address
 * moves only to a live domain, and the proxy redirects only to an active own main domain.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `d${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS custom domains", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let slug: string;
  const sub = () => `rls-${run}a.test`;
  const own = `shop.${run}.example.com`;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    slug = (await db.from("tenants").select("slug").eq("id", a.tenantId).single()).data!.slug;
    const { error } = await db.from("tenant_domains").insert({ tenant_id: a.tenantId, hostname: own, kind: "custom", status: "pending" });
    if (error) throw error;
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  const resolveBySlug = async () => (await anon().rpc("resolve_shop", { p_slug: slug })).data?.[0];

  it("customers read their own domains but cannot write any", async () => {
    expect((await a.client.from("tenant_domains").select("hostname").eq("tenant_id", a.tenantId)).data).toHaveLength(2);
    expect((await b.client.from("tenant_domains").select("hostname").eq("tenant_id", a.tenantId)).data).toEqual([]);
    expect((await a.client.from("tenant_domains").insert({ tenant_id: a.tenantId, hostname: `x.${run}.example.com`, kind: "custom", status: "active" })).error).not.toBeNull();
    await a.client.from("tenant_domains").update({ status: "active" }).eq("hostname", own);
    expect((await db.from("tenant_domains").select("status").eq("hostname", own).single()).data?.status).toBe("pending");
    expect((await a.client.rpc("set_primary_domain" as never, { p_tenant: a.tenantId, p_hostname: own } as never)).error).not.toBeNull();
  });

  it("a domain that is not live yet can neither serve the shop nor become the main address", async () => {
    expect((await anon().rpc("resolve_shop", { p_host: own })).data).toEqual([]);
    expect((await db.rpc("set_primary_domain", { p_tenant: a.tenantId, p_hostname: own })).data).toBe(false);
    expect((await resolveBySlug())?.redirect_host).toBeNull();
  });

  it("an active own main domain becomes the redirect target; back to Sellycat removes it", async () => {
    await db.from("tenant_domains").update({ status: "active" }).eq("hostname", own);
    expect((await db.rpc("set_primary_domain", { p_tenant: a.tenantId, p_hostname: own })).data).toBe(true);
    expect(await resolveBySlug()).toMatchObject({ primary_host: own, redirect_host: own });
    expect((await anon().rpc("resolve_shop", { p_host: own })).data?.[0]?.tenant_id).toBe(a.tenantId);
    expect((await db.rpc("set_primary_domain", { p_tenant: a.tenantId, p_hostname: sub() })).data).toBe(true);
    expect(await resolveBySlug()).toMatchObject({ primary_host: sub(), redirect_host: null });
  });

  it("another shop's domain cannot be made main address of this shop", async () => {
    expect((await db.rpc("set_primary_domain", { p_tenant: b.tenantId, p_hostname: own })).data).toBe(false);
  });
});
