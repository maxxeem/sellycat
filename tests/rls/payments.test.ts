/**
 * Phase 3 against the real staging database: stock reservation without overselling, limits per
 * order and per buyer, fulfilment and refunds idempotent, and orders/buyers/Stripe accounts
 * invisible to other tenants and to anon. Skipped without credentials.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `p${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS payments", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let dealId: string;

  const checkout = (qty: number, email: string, minutes = 35) =>
    db.rpc("start_checkout", { p_deal: dealId, p_qty: qty, p_email: email, p_name: "Test", p_newsletter: true, p_locale: "de", p_minutes: minutes });
  const deal = async () => (await db.from("deals").select("sold_qty, reserved_qty, total_qty").eq("id", dealId).single()).data!;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}-a`);
    b = await makeTenant(db, `${run}-b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    dealId = (
      await db.from("deals").insert({ tenant_id: a.tenantId, slug: "pay", title: "Pay deal", price_cents: 2500, state: "published", total_qty: 5, max_per_order: 3, max_per_buyer: 4 }).select("id").single()
    ).data!.id;
  });

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("reserves stock and refuses what is not there", async () => {
    const first = await checkout(3, "one@example.com");
    expect(first.error).toBeNull();
    expect(first.data?.[0]).toMatchObject({ amount_cents: 7500, currency: "CHF", title: "Pay deal" });
    expect(await deal()).toMatchObject({ reserved_qty: 3, sold_qty: 0 });
    expect((await checkout(4, "two@example.com")).error?.message).toContain("checkout:max_per_order");
    expect((await checkout(3, "two@example.com")).error?.message).toContain("checkout:not_enough");
    expect((await checkout(2, "two@example.com")).error).toBeNull();
    expect((await checkout(1, "three@example.com")).error?.message).toContain("checkout:sold_out");
  });

  it("parallel buyers of the last items never oversell", async () => {
    // Free everything, then 6 buyers race for 5 items.
    const { data: open } = await db.from("orders").select("id").eq("tenant_id", a.tenantId).eq("status", "pending");
    for (const o of open ?? []) await db.rpc("release_order", { p_order: o.id });
    expect(await deal()).toMatchObject({ reserved_qty: 0 });
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => checkout(1, `race${i}@example.com`)));
    expect(results.filter((r) => !r.error)).toHaveLength(5);
    expect(await deal()).toMatchObject({ reserved_qty: 5 });
  });

  it("expired reservations free their stock on the next checkout", async () => {
    const { data: open } = await db.from("orders").select("id").eq("tenant_id", a.tenantId).eq("status", "pending");
    for (const o of open ?? []) await db.rpc("release_order", { p_order: o.id });
    const r = await checkout(2, "late@example.com", -1);
    expect(r.error).toBeNull();
    expect(await deal()).toMatchObject({ reserved_qty: 2 });
    // The next checkout releases the expired one first.
    expect((await checkout(3, "next@example.com")).error).toBeNull();
    expect(await deal()).toMatchObject({ reserved_qty: 3 });
    const { data: late } = await db.from("orders").select("status").eq("id", r.data![0].order_id).single();
    expect(late?.status).toBe("expired");
  });

  it("fulfils once, records refunds, restocks once, and limits per buyer", async () => {
    const { data: open } = await db.from("orders").select("id").eq("tenant_id", a.tenantId).eq("status", "pending");
    for (const o of open ?? []) await db.rpc("release_order", { p_order: o.id });
    const r = await checkout(3, "Buyer@Example.com");
    const orderId = r.data![0].order_id;
    const session = `cs_test_${run}`;
    await db.from("orders").update({ stripe_session_id: session }).eq("id", orderId);
    expect((await db.rpc("fulfil_order", { p_session: session, p_payment_intent: `pi_${run}` })).data).toBe(orderId);
    expect((await db.rpc("fulfil_order", { p_session: session, p_payment_intent: `pi_${run}` })).data).toBe(orderId);
    expect(await deal()).toMatchObject({ reserved_qty: 0, sold_qty: 3 });
    const { data: buyer } = await db.from("buyers").select("email, newsletter_opt_in_at").eq("tenant_id", a.tenantId).eq("email", "buyer@example.com").single();
    expect(buyer?.newsletter_opt_in_at).not.toBeNull();

    // Already 3 bought, limit 4 per buyer.
    expect((await checkout(2, "buyer@example.com")).error?.message).toContain("checkout:max_per_buyer");

    await db.rpc("record_refund", { p_payment_intent: `pi_${run}`, p_refunded: 2500 });
    expect((await db.from("orders").select("status, refunded_cents").eq("id", orderId).single()).data).toMatchObject({ status: "partially_refunded", refunded_cents: 2500 });
    await db.rpc("record_refund", { p_payment_intent: `pi_${run}`, p_refunded: 7500 });
    await db.rpc("record_refund", { p_payment_intent: `pi_${run}`, p_refunded: 2500 });
    expect((await db.from("orders").select("status, refunded_cents").eq("id", orderId).single()).data).toMatchObject({ status: "refunded", refunded_cents: 7500 });
    expect((await db.rpc("restock_order", { p_order: orderId })).data).toBe(true);
    expect((await db.rpc("restock_order", { p_order: orderId })).data).toBe(false);
    expect(await deal()).toMatchObject({ sold_qty: 0 });
  });

  it("a payment after the reservation was released still sells (and flags oversold if needed)", async () => {
    const r = await checkout(1, "slow@example.com");
    const orderId = r.data![0].order_id;
    const session = `cs_slow_${run}`;
    await db.from("orders").update({ stripe_session_id: session }).eq("id", orderId);
    await db.rpc("release_order", { p_order: orderId });
    expect((await db.rpc("fulfil_order", { p_session: session, p_payment_intent: `pi_slow_${run}` })).data).toBe(orderId);
    const { data: order } = await db.from("orders").select("status, oversold").eq("id", orderId).single();
    expect(order).toMatchObject({ status: "paid", oversold: false });
  });

  it("only the service role may run the stock functions", async () => {
    const r = await a.client.rpc("start_checkout", { p_deal: dealId, p_qty: 1, p_email: "x@example.com", p_name: "", p_newsletter: false, p_locale: "de", p_minutes: 35 });
    expect(r.error).not.toBeNull();
    expect((await anon().rpc("fulfil_order", { p_session: "x", p_payment_intent: "y" })).error).not.toBeNull();
  });

  it("one Stripe account can serve several shops, each still only sees its own row", async () => {
    const shared = `acct_shared_${run}`;
    expect((await db.from("stripe_accounts").insert({ tenant_id: b.tenantId, account_id: shared })).error).toBeNull();
    const c = await makeTenant(db, `${run}-c`);
    try {
      expect((await db.from("stripe_accounts").insert({ tenant_id: c.tenantId, account_id: shared })).error).toBeNull();
      expect((await c.client.from("stripe_accounts").select("tenant_id")).data).toEqual([{ tenant_id: c.tenantId }]);
    } finally {
      await db.from("stripe_accounts").delete().eq("tenant_id", b.tenantId);
      await dropTenant(db, c);
    }
  });

  it("orders, buyers and Stripe accounts stay inside their tenant", async () => {
    await db.from("stripe_accounts").insert({ tenant_id: a.tenantId, account_id: `acct_${run}`, charges_enabled: true });
    expect((await a.client.from("orders").select("id").eq("tenant_id", a.tenantId)).data?.length).toBeGreaterThan(0);
    expect((await a.client.from("stripe_accounts").select("account_id")).data).toEqual([{ account_id: `acct_${run}` }]);
    for (const table of ["orders", "order_items", "buyers", "reservations", "stripe_accounts"] as const) {
      expect((await b.client.from(table).select("tenant_id").eq("tenant_id", a.tenantId)).data, table).toEqual([]);
      expect((await anon().from(table).select("tenant_id").eq("tenant_id", a.tenantId)).data, table).toEqual([]);
    }
    expect((await a.client.from("orders").update({ status: "refunded" }).eq("tenant_id", a.tenantId).select("id")).data ?? []).toEqual([]);
    expect((await a.client.from("stripe_accounts").update({ charges_enabled: false }).eq("tenant_id", a.tenantId).select("tenant_id")).data ?? []).toEqual([]);
    const { data: profile } = await anon().rpc("shop_profile", { p_tenant: a.tenantId });
    expect(profile?.[0]?.payments_ready).toBe(true);
  });
});
