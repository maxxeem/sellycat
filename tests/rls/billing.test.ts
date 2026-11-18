/**
 * Plans and subscriptions against staging: everyone reads public plans, customers never change
 * their plan or billing state themselves, enquiries stay private, the Free plan limits live deals
 * and shows Sellycat branding.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `b${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS billing", () => {
  let db: DB;
  let a: TestTenant;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
  }, 60_000);

  afterAll(async () => dropTenant(db, a));

  it("new shops start on Free; anyone reads the public plans, never the Stripe ids of hidden ones", async () => {
    expect((await db.from("tenants").select("plan_id").eq("id", a.tenantId).single()).data?.plan_id).toBe("free");
    const { data } = await anon().from("plans").select("id, contact_only").order("sort_order");
    expect(data?.map((p) => p.id)).toEqual(expect.arrayContaining(["free", "starter", "pro", "business"]));
    expect(data?.find((p) => p.id === "business")?.contact_only).toBe(true);
  });

  it("customers cannot change their plan or billing state", async () => {
    for (const patch of [{ plan_id: "pro" }, { billing_status: "active" }, { stripe_subscription_id: "sub_x" }, { pending_plan_id: "pro" }, { cancel_at_period_end: true }]) {
      const { error } = await a.client.from("tenants").update(patch).eq("id", a.tenantId);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
    expect((await db.from("tenants").select("plan_id, billing_status").eq("id", a.tenantId).single()).data).toMatchObject({ plan_id: "free", billing_status: "none" });
  });

  it("nobody but staff touches plans or reads enquiries", async () => {
    await a.client.from("plans").update({ application_fee_bps: 0 }).eq("id", "free");
    expect((await db.from("plans").select("application_fee_bps").eq("id", "free").single()).data?.application_fee_bps).toBeGreaterThan(0);
    const { data: id } = await db.from("contact_requests").insert({ name: "Test", email: `x@${run}.test`, message: "Hallo" }).select("id").single();
    expect((await anon().from("contact_requests").select("id")).data ?? []).toHaveLength(0);
    expect((await a.client.from("contact_requests").select("id")).data ?? []).toHaveLength(0);
    await db.from("contact_requests").delete().eq("id", id!.id);
  });

  it("Free allows three live deals and shows the branding; a bigger plan lifts both", async () => {
    const publish = (slug: string) => a.client.from("deals").insert({ tenant_id: a.tenantId, slug, title: slug, price_cents: 100, state: "published" });
    for (const s of ["d1", "d2", "d3"]) expect((await publish(s)).error).toBeNull();
    const fourth = await publish("d4");
    expect(fourth.error?.message).toContain("plan limit deals_live");
    // A draft is fine, publishing it is not.
    expect((await a.client.from("deals").insert({ tenant_id: a.tenantId, slug: "d5", title: "d5", price_cents: 100 })).error).toBeNull();
    expect((await a.client.from("deals").update({ state: "published" }).eq("slug", "d5").eq("tenant_id", a.tenantId)).error?.message).toContain("plan limit");
    expect((await anon().rpc("shop_profile", { p_tenant: a.tenantId })).data?.[0]?.settings).toMatchObject({ branding: true });

    await db.from("tenants").update({ plan_id: "pro" }).eq("id", a.tenantId);
    expect((await publish("d4")).error).toBeNull();
    expect((await anon().rpc("shop_profile", { p_tenant: a.tenantId })).data?.[0]?.settings).toMatchObject({ branding: false });
  });
});
