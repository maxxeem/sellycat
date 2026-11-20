/**
 * Partner settlements against staging: per deal off / after sale / after redemption, commission in %
 * or fixed payout, partial redemptions pro rata, nothing settled twice, refunds and undone
 * redemptions reversed once, only owners/admins of the shop, final statements locked.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `p${Date.now().toString(36)}`;
const until = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());

describe.skipIf(!rlsEnabled)("RLS partner settlements", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let partner: string;
  let saleVoucher: string;
  let redemption: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    b = await makeTenant(db, `${run}b`);
    partner = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Pizzeria", billing: { iban: "CH93 0076 2011 6238 5295 7" } }).select("id").single()).data!.id;
    const deal = async (slug: string, row: Record<string, unknown> & { price_cents: number }) =>
      (await db.from("deals").insert({ tenant_id: a.tenantId, slug, title: slug, partner_id: partner, ...row } as never).select("id").single()).data!.id;
    const sale = await deal("sale", { price_cents: 5000, settle_mode: "sale", settle_kind: "percent", settle_commission_bps: 2000 });
    const red = await deal("red", { price_cents: 4000, deal_type: "value", value_cents: 5000, partial_redemption: true, settle_mode: "redemption", settle_kind: "fixed", settle_payout_cents: 3000 });
    const off = await deal("off", { price_cents: 1000 });
    const buyer = (await db.from("buyers").insert({ tenant_id: a.tenantId, email: `b-${run}@example.com` }).select("id").single()).data!.id;
    const order = (await db.from("orders").insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `S-${run}`, status: "paid", email: `b-${run}@example.com`, currency: "CHF", amount_cents: 10000, paid_at: new Date(Date.now() - 60_000).toISOString() }).select("id").single()).data!.id;
    const voucher = async (dealId: string, unit: number, value: number | null) => {
      const item = (await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, deal_id: dealId, title: "x", qty: 1, unit_cents: unit, total_cents: unit }).select("id").single()).data!.id;
      return (await db
        .from("vouchers")
        .insert({ tenant_id: a.tenantId, order_id: order, order_item_id: item, deal_id: dealId, partner_id: partner, title: "x", code_format: "qr", code: randomBytes(5).toString("hex"), token: randomBytes(16).toString("hex"), value_cents: value, remaining_cents: value, partial: value !== null })
        .select("id")
        .single()).data!.id;
    };
    saleVoucher = await voucher(sale, 5000, null);
    const redVoucher = await voucher(red, 4000, 5000);
    await voucher(off, 1000, null);
    redemption = (await db.from("redemptions").insert({ tenant_id: a.tenantId, voucher_id: redVoucher, amount_cents: 2500, partner_id: partner, created_at: new Date(Date.now() - 30_000).toISOString() }).select("id").single()).data!.id;
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("shows what is open: sale with %, half a redemption with fixed payout, nothing for 'off'", async () => {
    const { data, error } = await a.client.rpc("settlement_open", { p_tenant: a.tenantId, p_until: until() });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    // Sale: 5000 − 20 % = 4000. Redemption: half of the voucher → base 2000, payout 1500.
    expect(data![0]).toMatchObject({ partner_id: partner, lines: 2, base_cents: 7000, commission_cents: 1500, payout_cents: 5500 });
  });

  it("other shops and visitors can neither see nor create statements", async () => {
    expect((await b.client.rpc("settlement_open", { p_tenant: a.tenantId, p_until: until() })).error).not.toBeNull();
    expect((await b.client.rpc("create_settlement", { p_tenant: a.tenantId, p_partner: partner, p_until: until() })).error).not.toBeNull();
    expect((await anon().rpc("create_settlement", { p_tenant: a.tenantId, p_partner: partner, p_until: until() })).error).not.toBeNull();
  });

  it("creates, finalises and locks a statement; nothing is settled twice", async () => {
    const { data: id, error } = await a.client.rpc("create_settlement", { p_tenant: a.tenantId, p_partner: partner, p_until: until() });
    expect(error).toBeNull();
    const { data: s } = await a.client.from("partner_settlements").select("status, number, payout_cents, partner").eq("id", id!).single();
    expect(s).toMatchObject({ status: "draft", number: null, payout_cents: 5500 });
    expect((s!.partner as { billing: { iban: string } }).billing.iban).toContain("CH93");
    expect((await b.client.from("partner_settlements").select("id").eq("id", id!)).data ?? []).toHaveLength(0);
    expect((await a.client.from("partner_settlements").update({ payout_cents: 1 }).eq("id", id!).select("id")).data ?? []).toHaveLength(0);

    expect((await a.client.rpc("settlement_set_status", { p_settlement: id!, p_status: "final" })).error).toBeNull();
    expect((await a.client.from("partner_settlements").select("number").eq("id", id!).single()).data?.number).toBe(1);
    expect((await a.client.rpc("settlement_set_status", { p_settlement: id!, p_status: "deleted" })).error).not.toBeNull();
    expect((await a.client.rpc("create_settlement", { p_tenant: a.tenantId, p_partner: partner, p_until: until() })).data).toBeNull();
  });

  it("reverses refunded sales and undone redemptions once", async () => {
    await db.from("vouchers").update({ status: "refunded" }).eq("id", saleVoucher);
    await db.from("redemptions").update({ undone_at: new Date().toISOString() }).eq("id", redemption);
    const { data } = await a.client.rpc("settlement_open", { p_tenant: a.tenantId, p_until: until() });
    expect(data![0]).toMatchObject({ lines: 2, payout_cents: -5500 });
    const { data: id } = await a.client.rpc("create_settlement", { p_tenant: a.tenantId, p_partner: partner, p_until: until() });
    await a.client.rpc("settlement_set_status", { p_settlement: id!, p_status: "final" });
    expect((await a.client.rpc("settlement_open", { p_tenant: a.tenantId, p_until: until() })).data).toHaveLength(0);
  });

  it("fee overview: net fee after refunds, only for the own shop", async () => {
    await db.from("orders").update({ fee_cents: 1000, refunded_cents: 2500, status: "partially_refunded" }).eq("tenant_id", a.tenantId);
    const { data, error } = await a.client.rpc("fee_months", { p_tenant: a.tenantId, p_months: 12 });
    expect(error).toBeNull();
    expect(data?.[0]).toMatchObject({ orders: 1, amount_cents: 10000, refunded_cents: 2500, fee_cents: 750 });
    const month = data![0].month.slice(0, 7);
    const lines = (await a.client.rpc("fee_lines", { p_tenant: a.tenantId, p_month: `${month}-01` })).data ?? [];
    expect(lines[0]).toMatchObject({ fee_cents: 1000, net_fee_cents: 750 });
    expect((await b.client.rpc("fee_months", { p_tenant: a.tenantId, p_months: 12 })).error).not.toBeNull();
    expect((await b.client.rpc("fee_lines", { p_tenant: a.tenantId, p_month: `${month}-01` })).error).not.toBeNull();
  });
});
