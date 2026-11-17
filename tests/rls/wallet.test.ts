/**
 * Phase 5 against staging: wallet designs stay inside their shop; pass tokens, devices and
 * registrations are server-only (nobody else may read or write them).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `w${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS wallet", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let voucherId: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    const deal = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "w", title: "Wallet deal", price_cents: 1000, state: "published" }).select("id").single()).data!.id;
    const start = await db.rpc("start_checkout", { p_deal: deal, p_qty: 1, p_email: `buyer@${run}.test`, p_name: "T", p_newsletter: false, p_locale: "de", p_minutes: 35 });
    const order = start.data![0].order_id;
    await db.from("orders").update({ stripe_session_id: `cs_${run}` }).eq("id", order);
    await db.rpc("fulfil_order", { p_session: `cs_${run}`, p_payment_intent: `pi_${run}` });
    voucherId = (await db.from("vouchers").select("id").eq("order_id", order).single()).data!.id;
    await db.from("wallet_passes").insert({ voucher_id: voucherId, tenant_id: a.tenantId, auth_token: "s".repeat(32) });
    await db.from("wallet_devices").insert({ device_id: `dev-${run}`, push_token: "push" });
    await db.from("wallet_registrations").insert({ device_id: `dev-${run}`, voucher_id: voucherId, tenant_id: a.tenantId });
  }, 60_000);

  afterAll(async () => {
    await db.from("wallet_devices").delete().eq("device_id", `dev-${run}`);
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("pass tokens, devices and registrations are server-only", async () => {
    for (const c of [a.client, b.client, anon()]) {
      expect((await c.from("wallet_passes").select("auth_token")).data).toEqual([]);
      expect((await c.from("wallet_devices").select("push_token")).data).toEqual([]);
      expect((await c.from("wallet_registrations").select("device_id")).data).toEqual([]);
    }
    expect((await a.client.from("wallet_passes").insert({ voucher_id: voucherId, tenant_id: a.tenantId, auth_token: "x".repeat(32) })).error).not.toBeNull();
    expect((await anon().from("wallet_devices").insert({ device_id: "evil", push_token: "x" })).error).not.toBeNull();
  });

  it("wallet designs belong to their shop", async () => {
    expect((await a.client.from("wallet_designs").upsert({ tenant_id: a.tenantId, background: "#112233" })).error).toBeNull();
    expect((await b.client.from("wallet_designs").select("background").eq("tenant_id", a.tenantId)).data).toEqual([]);
    expect((await b.client.from("wallet_designs").upsert({ tenant_id: a.tenantId, background: "#000000" })).error).not.toBeNull();
    expect((await a.client.from("wallet_designs").upsert({ tenant_id: a.tenantId, background: "blue" })).error).not.toBeNull();
    expect((await db.from("wallet_designs").select("background").eq("tenant_id", a.tenantId).single()).data?.background).toBe("#112233");
  });

  it("deleting a voucher's shop removes its passes and registrations", async () => {
    expect((await db.from("wallet_registrations").select("device_id").eq("voucher_id", voucherId)).data).toHaveLength(1);
  });
});
