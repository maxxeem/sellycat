/**
 * Findings of the security review, closed in the database: partner bank details and settlement
 * terms are not public, shop creation only on Sellycat's root domains, code sign-in guesses are
 * counted atomically, redemption locations must fit the voucher, helper functions closed to anon.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `s${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS security review", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let partnerA: string;
  let locationA: string;
  let locationOther: string;
  let voucher: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    b = await makeTenant(db, `${run}b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    partnerA = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Pizza", billing: { iban: "CH9300762011623852957" } }).select("id").single()).data!.id;
    const partnerOther = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Other" }).select("id").single()).data!.id;
    locationA = (await db.from("partner_locations").insert({ tenant_id: a.tenantId, partner_id: partnerA, name: "Bern" }).select("id").single()).data!.id;
    locationOther = (await db.from("partner_locations").insert({ tenant_id: a.tenantId, partner_id: partnerOther, name: "Thun" }).select("id").single()).data!.id;
    const deal = (await db
      .from("deals")
      .insert({ tenant_id: a.tenantId, slug: "live", title: "Live", price_cents: 2000, state: "published", partner_id: partnerA, settle_mode: "sale", settle_kind: "percent", settle_commission_bps: 1500 })
      .select("id")
      .single()).data!.id;
    const buyer = (await db.from("buyers").insert({ tenant_id: a.tenantId, email: `b-${run}@example.com` }).select("id").single()).data!.id;
    const order = (await db.from("orders").insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `S-${run}`, status: "paid", email: `b-${run}@example.com`, currency: "CHF", amount_cents: 2000 }).select("id").single()).data!.id;
    const item = (await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, deal_id: deal, title: "Live", qty: 1, unit_cents: 2000, total_cents: 2000 }).select("id").single()).data!.id;
    voucher = (await db
      .from("vouchers")
      .insert({ tenant_id: a.tenantId, order_id: order, order_item_id: item, deal_id: deal, partner_id: partnerA, title: "Live", code_format: "qr", code: `${run}-1`.toUpperCase(), token: randomBytes(16).toString("hex") })
      .select("id")
      .single()).data!.id;
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("hides partner bank details from anon and members, keeps the public columns", async () => {
    const pub = anon();
    expect((await pub.from("partners").select("billing").eq("id", partnerA)).error).not.toBeNull();
    expect((await pub.from("partners").select("id, name").eq("id", partnerA)).data).toEqual([{ id: partnerA, name: "Pizza" }]);
    expect((await a.client.from("partners").select("billing").eq("id", partnerA)).error).not.toBeNull();
    expect((await a.client.from("partners").update({ billing: { iban: "x" } }).eq("id", partnerA)).error).toBeNull();
  });

  it("hides settlement terms of deals from anon", async () => {
    const pub = anon();
    expect((await pub.from("deals").select("settle_commission_bps").eq("tenant_id", a.tenantId)).error).not.toBeNull();
    expect((await pub.from("deals").select("slug, price_cents").eq("tenant_id", a.tenantId)).data).toEqual([{ slug: "live", price_cents: 2000 }]);
    expect((await a.client.from("deals").select("settle_commission_bps").eq("tenant_id", a.tenantId)).data).toEqual([{ settle_commission_bps: 1500 }]);
  });

  it("creates shops only on Sellycat's root domains", async () => {
    const { error } = await b.client.rpc("create_tenant", { p_name: "X", p_slug: `${run}x`, p_root: "marke.ch" });
    expect(error?.message).toMatch(/root domain|signup paused/);
    expect((await db.from("tenant_domains").select("id").eq("hostname", `${run}x.marke.ch`)).data).toHaveLength(0);
  });

  it("closes helper functions to anon", async () => {
    const pub = anon();
    expect((await pub.rpc("plan_allows", { p_tenant: a.tenantId, p_feature: "api" })).error).not.toBeNull();
    expect((await pub.rpc("team_seats_used", { p_tenant: a.tenantId })).error).not.toBeNull();
  });

  it("counts code guesses atomically, even in parallel", async () => {
    const email = `r-${run}@example.com`;
    await db.from("redeem_logins").insert({ tenant_id: a.tenantId, email, code_hash: "0".repeat(64), expires_at: new Date(Date.now() + 600_000).toISOString() });
    const tries = await Promise.all(Array.from({ length: 12 }, () => db.rpc("redeem_login_try", { p_tenant: a.tenantId, p_email: email, p_max: 5 })));
    expect(tries.filter((t) => (t.data ?? []).length > 0)).toHaveLength(5);
    expect((await a.client.rpc("redeem_login_try", { p_tenant: a.tenantId, p_email: email, p_max: 5 })).error).not.toBeNull();
  });

  it("only accepts a location of the voucher's partner", async () => {
    expect((await a.client.rpc("redeem_voucher", { p_voucher: voucher, p_location: locationOther })).data).toMatchObject({ ok: false, error: "location" });
    expect((await a.client.rpc("redeem_voucher", { p_voucher: voucher, p_location: locationA })).data).toMatchObject({ ok: true });
  });

  it("skips a pool code that a voucher of the shop already uses", async () => {
    const deal = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "pool", title: "Pool", price_cents: 1000, code_source: "pool" }).select("id").single()).data!.id;
    const dup = `${run}-1`.toUpperCase(); // the voucher from beforeAll has this code
    await db.from("code_pool").insert([
      { tenant_id: a.tenantId, deal_id: deal, code: dup },
      { tenant_id: a.tenantId, deal_id: deal, code: `${run}-POOL`.toUpperCase() },
    ]);
    const buyer = (await db.from("buyers").select("id").eq("tenant_id", a.tenantId).limit(1).single()).data!.id;
    const order = (await db.from("orders").insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `P-${run}`, status: "paid", email: `b-${run}@example.com`, currency: "CHF", amount_cents: 1000 }).select("id").single()).data!.id;
    await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, deal_id: deal, title: "Pool", qty: 1, unit_cents: 1000, total_cents: 1000 });
    expect((await db.rpc("issue_vouchers", { p_order: order })).data).toBe(1);
    expect((await db.from("vouchers").select("code").eq("order_id", order)).data).toEqual([{ code: `${run}-POOL`.toUpperCase() }]);
  });
});
