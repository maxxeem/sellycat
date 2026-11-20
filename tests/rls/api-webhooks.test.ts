/**
 * API keys and webhooks against staging: keys only as hash and only for plans with the API,
 * secrets never readable by clients, events from the triggers (payment, redemption, void),
 * redemption via API only within the key's shop, and the shared redeem path still works.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashKey, newApiKey, keyPrefix } from "@/lib/developers/rules";
import { admin, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `w${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS api & webhooks", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let keyA: string;
  let keyIdA: string;
  let keyB: string;
  let order: string;
  let voucherApi: string;
  let voucherDash: string;
  let codeApi: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    b = await makeTenant(db, `${run}b`);
    await db.from("tenants").update({ plan_id: "pro" }).eq("id", a.tenantId);
    keyA = newApiKey();
    keyB = newApiKey();
    keyIdA = (await db.from("api_keys").insert({ tenant_id: a.tenantId, name: "A", prefix: keyPrefix(keyA), key_hash: hashKey(keyA), scopes: ["read", "redeem"] }).select("id").single()).data!.id;
    await db.from("api_keys").insert({ tenant_id: b.tenantId, name: "B", prefix: keyPrefix(keyB), key_hash: hashKey(keyB), scopes: ["read"] });
    await db.from("webhook_endpoints").insert({ tenant_id: a.tenantId, url: "https://example.com/hook", events: ["order.paid", "voucher.redeemed", "voucher.voided"], secret: `whsec_${randomBytes(24).toString("hex")}` });
    await db.from("webhook_endpoints").insert({ tenant_id: b.tenantId, url: "https://example.com/hook-b", events: ["order.paid"], secret: `whsec_${randomBytes(24).toString("hex")}` });

    const buyer = (await db.from("buyers").insert({ tenant_id: a.tenantId, email: `b-${run}@example.com` }).select("id").single()).data!.id;
    order = (await db.from("orders").insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `W-${run}`, status: "pending", email: `b-${run}@example.com`, currency: "CHF", amount_cents: 6000 }).select("id").single()).data!.id;
    const item = (await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, title: "Pizza", qty: 2, unit_cents: 3000, total_cents: 6000 }).select("id").single()).data!.id;
    const voucher = async (value: number | null) => {
      const code = `${run}-${randomBytes(3).toString("hex")}`.toUpperCase();
      const id = (await db
        .from("vouchers")
        .insert({ tenant_id: a.tenantId, order_id: order, order_item_id: item, title: "Pizza", code_format: "qr", code, token: randomBytes(16).toString("hex"), value_cents: value, remaining_cents: value, partial: value !== null })
        .select("id")
        .single()).data!.id;
      return { id, code };
    };
    const v1 = await voucher(5000);
    voucherApi = v1.id;
    codeApi = v1.code;
    voucherDash = (await voucher(null)).id;
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("finds the shop for a valid key only (hash, not revoked, plan with API)", async () => {
    const { data } = await db.rpc("api_key_auth", { p_hash: hashKey(keyA) });
    expect(data?.[0]).toMatchObject({ tenant_id: a.tenantId, key_id: keyIdA });
    expect((await db.rpc("api_key_auth", { p_hash: hashKey(keyB) })).data ?? []).toHaveLength(0); // B is on Free
    expect((await db.rpc("api_key_auth", { p_hash: hashKey(newApiKey()) })).data ?? []).toHaveLength(0);
  });

  it("clients cannot call the server functions or read hashes and secrets", async () => {
    expect((await a.client.rpc("api_key_auth", { p_hash: hashKey(keyA) })).error).not.toBeNull();
    expect((await a.client.rpc("api_redeem_voucher", { p_tenant: a.tenantId, p_key: keyIdA, p_code: codeApi })).error).not.toBeNull();
    expect((await a.client.rpc("webhook_claim", { p_limit: 5 })).error).not.toBeNull();
    expect((await a.client.from("api_keys").select("key_hash")).error).not.toBeNull();
    expect((await a.client.from("webhook_endpoints").select("secret")).error).not.toBeNull();
    expect((await a.client.from("api_keys").select("id, prefix")).data).toHaveLength(1);
    expect((await b.client.from("api_keys").select("id").eq("tenant_id", a.tenantId)).data ?? []).toHaveLength(0);
    expect((await b.client.from("webhook_endpoints").select("id").eq("tenant_id", a.tenantId)).data ?? []).toHaveLength(0);
    expect((await a.client.from("api_keys").insert({ tenant_id: a.tenantId, name: "x", prefix: "sc_live_xxxxxx", key_hash: "0".repeat(64) })).error).not.toBeNull();
  });

  it("payment writes an order.paid event with items and vouchers; shops without the API get none", async () => {
    await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order);
    const { data: events } = await db.from("webhook_events").select("id, type, data").eq("tenant_id", a.tenantId).eq("type", "order.paid");
    expect(events).toHaveLength(1);
    const data = events![0].data as { number: string; items: unknown[]; vouchers: Array<{ code: string }> };
    expect(data.number).toBe(`W-${run}`);
    expect(data.items).toHaveLength(1);
    expect(data.vouchers.map((v) => v.code)).toContain(codeApi);
    expect(JSON.stringify(data)).not.toContain("token");
    expect((await db.from("webhook_deliveries").select("status").eq("event_id", events![0].id)).data).toEqual([{ status: "pending" }]);
    // Owner of A sees the delivery, B does not.
    expect((await a.client.from("webhook_deliveries").select("id")).data).toHaveLength(1);
    expect((await b.client.from("webhook_deliveries").select("id").eq("tenant_id", a.tenantId)).data ?? []).toHaveLength(0);
  });

  it("redeems via API only within the key's shop, as source 'api'", async () => {
    expect((await db.rpc("api_redeem_voucher", { p_tenant: b.tenantId, p_key: keyIdA, p_code: codeApi })).data).toMatchObject({ ok: false, error: "not_found" });
    const r = await db.rpc("api_redeem_voucher", { p_tenant: a.tenantId, p_key: keyIdA, p_code: codeApi.toLowerCase(), p_amount: 2000 });
    expect(r.data).toMatchObject({ ok: true, remaining: 3000 });
    const { data: red } = await db.from("redemptions").select("source, api_key_id, user_id").eq("voucher_id", voucherApi).single();
    expect(red).toEqual({ source: "api", api_key_id: keyIdA, user_id: null });
    expect((await db.rpc("api_redeem_voucher", { p_tenant: a.tenantId, p_key: keyIdA, p_code: codeApi, p_amount: 9999 })).data).toMatchObject({ ok: false, error: "amount" });
    const { data: ev } = await db.from("webhook_events").select("data").eq("tenant_id", a.tenantId).eq("type", "voucher.redeemed").single();
    expect(ev!.data).toMatchObject({ amount_cents: 2000, source: "api", voucher: { remaining_cents: 3000 } });
  });

  it("the dashboard path (redeem_voucher) still works for the owner and keeps the user", async () => {
    const { data } = await a.client.rpc("redeem_voucher", { p_voucher: voucherDash, p_source: "api" });
    expect(data).toMatchObject({ ok: true });
    const { data: red } = await db.from("redemptions").select("source, user_id").eq("voucher_id", voucherDash).single();
    expect(red).toEqual({ source: "dashboard", user_id: a.userId });
    expect((await b.client.rpc("redeem_voucher", { p_voucher: voucherApi })).data).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("voiding writes voucher.voided", async () => {
    expect((await a.client.rpc("void_voucher", { p_voucher: voucherApi })).data).toMatchObject({ ok: true });
    const { data } = await db.from("webhook_events").select("data").eq("tenant_id", a.tenantId).eq("type", "voucher.voided");
    expect(data).toHaveLength(1);
    expect(data![0].data).toMatchObject({ id: voucherApi, status: "void" });
  });
});
