/**
 * View counter against staging: anyone may add a view of a live deal (once per call), nobody may
 * set the counter, and drafts are not counted. The shop profile carries the deal order.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `v${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS deal views and order", () => {
  let db: DB;
  let a: TestTenant;
  let live: string;
  let draft: string;
  const views = async (id: string) => (await db.from("deals").select("view_count").eq("id", id).single()).data!.view_count;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    live = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "live", title: "Live", price_cents: 100, state: "published" }).select("id").single()).data!.id;
    draft = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "draft", title: "Draft", price_cents: 100 }).select("id").single()).data!.id;
  }, 60_000);

  afterAll(async () => dropTenant(db, a));

  it("counts views of live deals only", async () => {
    await anon().rpc("track_deal_view", { p_deal: live });
    await anon().rpc("track_deal_view", { p_deal: live });
    await anon().rpc("track_deal_view", { p_deal: draft });
    expect(await views(live)).toBe(2);
    expect(await views(draft)).toBe(0);
  });

  it("nobody sets the counter directly", async () => {
    await a.client.from("deals").update({ view_count: 9999 }).eq("id", live);
    await anon().from("deals").update({ view_count: 9999 }).eq("id", live);
    expect(await views(live)).toBe(2);
  });

  it("the shop profile tells the deal order (manual by default)", async () => {
    expect((await anon().rpc("shop_profile", { p_tenant: a.tenantId })).data?.[0]?.settings).toMatchObject({ deal_order: "manual" });
    await db.from("tenants").update({ shop_settings: { deal_order: "bestseller" } }).eq("id", a.tenantId);
    expect((await anon().rpc("shop_profile", { p_tenant: a.tenantId })).data?.[0]?.settings).toMatchObject({ deal_order: "bestseller" });
  });
});
