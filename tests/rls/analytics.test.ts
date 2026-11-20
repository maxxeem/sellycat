/**
 * Analytics against staging: anyone may count a visit of a live shop or deal (daily rows, nothing
 * personal), nobody writes the rows directly, a shop only reads its own numbers, revenue is net of
 * refunds, and platform analytics are staff-only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `an${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());

type Result = { daily: { day: string; revenue_cents: number; orders: number; vouchers: number; shop_views: number; deal_views: number }[]; deals: { deal_id: string; views: number; qty: number; revenue_cents: number }[] };

describe.skipIf(!rlsEnabled)("RLS analytics", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let deal: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    b = await makeTenant(db, `${run}b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    deal = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "live", title: "Live", price_cents: 2000, state: "published" }).select("id").single()).data!.id;
    const buyer = (await db.from("buyers").insert({ tenant_id: a.tenantId, email: `buyer-${run}@example.com` }).select("id").single()).data!.id;
    const order = (await db
      .from("orders")
      .insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `A-${run}`, status: "partially_refunded", email: `buyer-${run}@example.com`, currency: "CHF", amount_cents: 4000, refunded_cents: 1000, fee_cents: 400, paid_at: new Date().toISOString() })
      .select("id")
      .single()).data!.id;
    await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, deal_id: deal, title: "Live", qty: 2, unit_cents: 2000, total_cents: 4000 });
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("counts shop and deal visits per day", async () => {
    await anon().rpc("track_shop_view", { p_tenant: a.tenantId });
    await anon().rpc("track_shop_view", { p_tenant: a.tenantId });
    await anon().rpc("track_deal_view", { p_deal: deal });
    const rows = (await db.from("analytics_daily").select("metric, count, deal_id, day").eq("tenant_id", a.tenantId)).data ?? [];
    expect(rows.find((r) => r.metric === "shop_view")).toMatchObject({ count: 2, deal_id: null, day: today() });
    expect(rows.find((r) => r.metric === "deal_view")).toMatchObject({ count: 1, deal_id: deal });
  });

  it("nobody writes or reads the rows from outside", async () => {
    expect((await anon().from("analytics_daily").select("tenant_id").eq("tenant_id", a.tenantId)).data ?? []).toHaveLength(0);
    expect((await b.client.from("analytics_daily").select("tenant_id").eq("tenant_id", a.tenantId)).data ?? []).toHaveLength(0);
    expect((await a.client.from("analytics_daily").insert({ tenant_id: a.tenantId, day: today(), metric: "shop_view", count: 999 })).error).not.toBeNull();
    // @ts-expect-error not exposed to clients
    expect((await anon().rpc("bump_analytics", { p_tenant: a.tenantId, p_metric: "shop_view", p_deal: null })).error).not.toBeNull();
  });

  it("the shop reads its own numbers, net of refunds", async () => {
    const { data, error } = await a.client.rpc("tenant_analytics", { p_tenant: a.tenantId, p_from: today(), p_to: today() });
    expect(error).toBeNull();
    const r = data as unknown as Result;
    expect(r.daily[0]).toMatchObject({ revenue_cents: 3000, orders: 1, vouchers: 2, shop_views: 2, deal_views: 1 });
    expect(r.deals[0]).toMatchObject({ deal_id: deal, views: 1, qty: 2, revenue_cents: 3000 });
  });

  it("other shops and visitors get nothing", async () => {
    expect((await b.client.rpc("tenant_analytics", { p_tenant: a.tenantId, p_from: today(), p_to: today() })).error).not.toBeNull();
    expect((await anon().rpc("tenant_analytics", { p_tenant: a.tenantId, p_from: today(), p_to: today() })).error).not.toBeNull();
  });

  it("platform analytics are for staff only", async () => {
    expect((await a.client.rpc("platform_analytics", { p_from: today(), p_to: today() })).error).not.toBeNull();
    await db.from("platform_staff").insert({ user_id: b.userId, role: "support" });
    try {
      const { data, error } = await b.client.rpc("platform_analytics", { p_from: today(), p_to: today() });
      expect(error).toBeNull();
      const r = data as unknown as { money: { currency: string; fee_cents: number }[]; daily: unknown[] };
      expect(r.daily).toHaveLength(1);
      expect(r.money.find((m) => m.currency === "CHF")?.fee_cents).toBeGreaterThanOrEqual(400);
    } finally {
      await db.from("platform_staff").delete().eq("user_id", b.userId);
    }
  });
});
