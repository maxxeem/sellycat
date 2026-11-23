/**
 * Shop online/offline against staging: new shops start as «building», only the server switches the
 * state or the note texts, and the public profile carries both.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `ss${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS shop state", () => {
  let db: DB;
  let owner: TestTenant;

  beforeAll(async () => {
    db = admin();
    owner = await makeTenant(db, run);
  }, 60_000);
  afterAll(() => dropTenant(db, owner));

  it("a new shop starts as building", async () => {
    const { data } = await db.from("tenants").select("shop_state, shop_notice").eq("id", owner.tenantId).single();
    expect(data).toEqual({ shop_state: "building", shop_notice: {} });
  });

  it("the owner cannot switch the state or the texts directly", async () => {
    expect((await owner.client.from("tenants").update({ shop_state: "online" }).eq("id", owner.tenantId)).error).not.toBeNull();
    expect((await owner.client.from("tenants").update({ shop_notice: { closed_title: "x" } }).eq("id", owner.tenantId)).error).not.toBeNull();
    expect((await db.from("tenants").select("shop_state").eq("id", owner.tenantId).single()).data?.shop_state).toBe("building");
  });

  it("the public profile shows the state and the texts set by the server", async () => {
    await db.from("tenants").update({ shop_state: "closed", shop_notice: { closed_title: "Betriebsferien", other: "ignored" } }).eq("id", owner.tenantId);
    const { data } = await anon().rpc("shop_profile", { p_tenant: owner.tenantId });
    expect(data?.[0]?.shop_state).toBe("closed");
    expect(data?.[0]?.shop_notice).toEqual({ building_title: null, building_text: null, closed_title: "Betriebsferien", closed_text: null });
    expect((await db.from("tenants").update({ shop_state: "open" }).eq("id", owner.tenantId)).error).not.toBeNull();
  });
});
