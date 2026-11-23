/**
 * Business includes up to 5 shops (`plans.limits.shops`) against staging: the owner of a Business
 * shop creates four more without an invite code, they follow the main shop's plan (downgrade →
 * Free, deletion → Free), the sixth needs the normal signup rules, and customers never change the
 * plan link themselves. Business has no minimum fee per sale.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `bs${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS business shops", () => {
  let db: DB;
  let main: TestTenant;
  const extra: string[] = [];

  beforeAll(async () => {
    db = admin();
    main = await makeTenant(db, run);
    await db.from("tenants").update({ plan_id: "business" }).eq("id", main.tenantId);
  }, 60_000);

  afterAll(async () => {
    if (extra.length) await db.from("tenants").delete().in("id", extra);
    await dropTenant(db, main);
  });

  const create = (n: number) => main.client.rpc("create_tenant", { p_name: `${run} ${n}`, p_slug: `${run}-${n}`, p_root: "localhost", p_locale: "de" });

  it("Business has no minimum fee and includes five shops", async () => {
    const { data } = await db.from("plans").select("application_fee_min, limits").eq("id", "business").single();
    expect(data?.application_fee_min).toBe(0);
    expect((data?.limits as Record<string, unknown>).shops).toBe(5);
    expect((await main.client.rpc("included_shop_room")).data).toBe(4);
  });

  it("four more shops join the Business plan without a code, the sixth follows the signup rules", async () => {
    for (const n of [1, 2, 3, 4]) {
      const { data: id, error } = await create(n);
      expect(error, `shop ${n}`).toBeNull();
      extra.push(id as string);
      const { data: row } = await db.from("tenants").select("plan_id, plan_parent_id").eq("id", id as string).single();
      expect(row).toEqual({ plan_id: "business", plan_parent_id: main.tenantId });
    }
    expect((await main.client.rpc("included_shop_room")).data).toBe(0);
    const mode = (await db.from("platform_settings").select("signup_mode").single()).data?.signup_mode;
    const sixth = await create(5);
    if (mode === "open") {
      expect(sixth.error).toBeNull();
      extra.push(sixth.data as string);
      expect((await db.from("tenants").select("plan_id, plan_parent_id").eq("id", sixth.data as string).single()).data).toEqual({ plan_id: "free", plan_parent_id: null });
    } else expect(sixth.error?.message).toContain("signup paused");
  });

  it("customers cannot change the plan link", async () => {
    const { error } = await main.client.from("tenants").update({ plan_parent_id: null }).eq("id", extra[0]!);
    expect(error).not.toBeNull();
    expect((await db.from("tenants").select("plan_parent_id").eq("id", extra[0]!).single()).data?.plan_parent_id).toBe(main.tenantId);
  });

  it("the included shops follow the main shop: other plan → Free and unlinked; deletion → Free", async () => {
    await db.from("tenants").update({ plan_id: "pro" }).eq("id", main.tenantId);
    const { data: after } = await db.from("tenants").select("plan_id, plan_parent_id").in("id", extra.slice(0, 4));
    expect(after?.every((r) => r.plan_id === "free" && r.plan_parent_id === null)).toBe(true);

    // Back to Business, link one shop again by hand (as staff would), then delete the main shop.
    await db.from("tenants").update({ plan_id: "business" }).eq("id", main.tenantId);
    await db.from("tenants").update({ plan_id: "business", plan_parent_id: main.tenantId }).eq("id", extra[0]!);
    await db.from("tenants").delete().eq("id", main.tenantId);
    expect((await db.from("tenants").select("plan_id, plan_parent_id").eq("id", extra[0]!).single()).data).toEqual({ plan_id: "free", plan_parent_id: null });
  });
});
