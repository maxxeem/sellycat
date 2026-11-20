/**
 * "Show voucher" with an email code: owner lookup (gift → recipient), codes only for the server,
 * guesses counted atomically.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `va${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS voucher access", () => {
  let db: DB;
  let a: TestTenant;
  let token: string;
  let giftToken: string;
  let voucher: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    const buyer = (await db.from("buyers").insert({ tenant_id: a.tenantId, email: `b-${run}@example.com` }).select("id").single()).data!.id;
    const mk = async (gift: boolean) => {
      const order = (await db
        .from("orders")
        .insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `VA-${run}-${gift ? "g" : "n"}`, status: "paid", email: `b-${run}@example.com`, currency: "CHF", amount_cents: 1000, gift, gift_email: gift ? `r-${run}@example.com` : null })
        .select("id")
        .single()).data!.id;
      const item = (await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, title: "X", qty: 1, unit_cents: 1000, total_cents: 1000 }).select("id").single()).data!.id;
      const tok = randomBytes(16).toString("hex");
      const id = (await db.from("vouchers").insert({ tenant_id: a.tenantId, order_id: order, order_item_id: item, title: "X", code_format: "qr", code: `${run}-${gift ? "G" : "N"}`.toUpperCase(), token: tok }).select("id").single()).data!.id;
      return { tok, id };
    };
    const n = await mk(false);
    token = n.tok;
    voucher = n.id;
    giftToken = (await mk(true)).tok;
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
  });

  it("finds the owner: buyer, or the recipient of a gift", async () => {
    expect((await db.rpc("voucher_owner", { p_token: token })).data?.[0]).toMatchObject({ voucher_id: voucher, tenant_id: a.tenantId, email: `b-${run}@example.com` });
    expect((await db.rpc("voucher_owner", { p_token: giftToken })).data?.[0]?.email).toBe(`r-${run}@example.com`);
  });

  it("keeps codes and the owner lookup away from clients", async () => {
    const pub = anon();
    expect((await pub.rpc("voucher_owner", { p_token: token })).error).not.toBeNull();
    expect((await a.client.rpc("voucher_owner", { p_token: token })).error).not.toBeNull();
    expect((await a.client.rpc("voucher_access_try", { p_voucher: voucher, p_max: 5 })).error).not.toBeNull();
    expect((await a.client.from("voucher_access").select("id")).error).not.toBeNull();
    expect((await pub.from("voucher_access").select("id")).error).not.toBeNull();
  });

  it("counts guesses atomically", async () => {
    await db.from("voucher_access").insert({ tenant_id: a.tenantId, voucher_id: voucher, code_hash: "0".repeat(64), expires_at: new Date(Date.now() + 600_000).toISOString() });
    const tries = await Promise.all(Array.from({ length: 12 }, () => db.rpc("voucher_access_try", { p_voucher: voucher, p_max: 5 })));
    expect(tries.filter((t) => (t.data ?? []).length > 0)).toHaveLength(5);
  });
});
