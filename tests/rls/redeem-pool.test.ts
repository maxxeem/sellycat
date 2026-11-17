/**
 * Phase 4, part 3 against staging: code pools (import rights, counter, auto-stop, handing out),
 * the redemption app's helpers and voucher designs stay inside their shop.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `r${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS code pool, redemption app, voucher designs", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let dealId: string;
  const poolFree = async () => (await db.from("deals").select("pool_free").eq("id", dealId).single()).data!.pool_free;
  const checkout = (qty: number, email: string) =>
    db.rpc("start_checkout", { p_deal: dealId, p_qty: qty, p_email: email, p_name: "Test", p_newsletter: false, p_locale: "de", p_minutes: 35 });

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    dealId = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "pool", title: "Pool deal", price_cents: 1000, state: "published", code_source: "pool" }).select("id").single()).data!.id;
  }, 60_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("only the shop's team imports codes; blanks and duplicates are skipped", async () => {
    const other = await b.client.rpc("import_pool_codes", { p_deal: dealId, p_codes: ["X1"] });
    expect(other.data).toMatchObject({ ok: false, error: "forbidden" });
    const r = await a.client.rpc("import_pool_codes", { p_deal: dealId, p_codes: ["P-1", "P-2", " P-2 ", "", "P-3"] });
    expect(r.data).toMatchObject({ ok: true, added: 3 });
    expect((await a.client.rpc("import_pool_codes", { p_deal: dealId, p_codes: ["P-3", "P-4"] })).data).toMatchObject({ ok: true, added: 1, skipped: 1 });
    expect(await poolFree()).toBe(4);
    expect((await b.client.from("code_pool").select("id").eq("deal_id", dealId)).data).toEqual([]);
    expect((await anon().from("code_pool").select("id").eq("deal_id", dealId)).data).toEqual([]);
  });

  it("customers cannot set the counter themselves", async () => {
    await a.client.from("deals").update({ pool_free: 999 }).eq("id", dealId);
    expect(await poolFree()).toBe(4);
  });

  it("sales stop when the pool is used up, and paid orders take codes from the pool", async () => {
    const first = await checkout(3, `buyer1@${run}.test`);
    expect(first.error).toBeNull();
    expect((await checkout(2, `buyer2@${run}.test`)).error?.message).toContain("checkout:not_enough");
    const order = first.data![0].order_id;
    await db.from("orders").update({ stripe_session_id: `cs_${run}` }).eq("id", order);
    await db.rpc("fulfil_order", { p_session: `cs_${run}`, p_payment_intent: `pi_${run}` });
    const codes = (await db.from("vouchers").select("code").eq("order_id", order)).data!.map((v) => v.code).sort();
    expect(codes).toEqual(["P-1", "P-2", "P-3"]);
    expect(await poolFree()).toBe(1);
    expect((await checkout(2, `buyer3@${run}.test`)).error?.message).toContain("checkout:not_enough");
  });

  it("clearing removes only free codes; an empty pool means sold out", async () => {
    expect((await b.client.rpc("clear_pool_codes", { p_deal: dealId })).data).toMatchObject({ ok: false });
    expect((await a.client.rpc("clear_pool_codes", { p_deal: dealId })).data).toMatchObject({ ok: true, removed: 1 });
    expect(await poolFree()).toBe(0);
    expect((await db.from("code_pool").select("id").eq("deal_id", dealId)).data).toHaveLength(3);
    expect((await checkout(1, `buyer4@${run}.test`)).error?.message).toContain("checkout:sold_out");
  });

  it("redemption app: access per shop, token lookup only for the shop's team, sign-in codes never readable", async () => {
    expect((await a.client.rpc("can_use_redeem", { p_tenant: a.tenantId })).data).toBe(true);
    expect((await b.client.rpc("can_use_redeem", { p_tenant: a.tenantId })).data).toBe(false);
    const { data: v } = await db.from("vouchers").select("token").eq("tenant_id", a.tenantId).limit(1).single();
    expect((await a.client.rpc("find_voucher_by_token", { p_tenant: a.tenantId, p_token: v!.token })).data).toBeTruthy();
    expect((await b.client.rpc("find_voucher_by_token", { p_tenant: a.tenantId, p_token: v!.token })).data).toBeNull();
    await db.from("redeem_logins").insert({ tenant_id: a.tenantId, email: "x@example.com", code_hash: "h", expires_at: new Date(Date.now() + 60_000).toISOString() });
    expect((await a.client.from("redeem_logins").select("id")).data).toEqual([]);
    expect((await a.client.rpc("redeem_user_id" as never, { p_tenant: a.tenantId, p_email: "x@example.com" } as never)).error).not.toBeNull();
    const { data: userEmail } = await db.auth.admin.getUserById(a.userId);
    expect((await db.rpc("redeem_user_id", { p_tenant: a.tenantId, p_email: userEmail.user!.email! })).data).toBe(a.userId);
    expect((await db.rpc("redeem_user_id", { p_tenant: b.tenantId, p_email: userEmail.user!.email! })).data).toBeNull();
  });

  it("voucher designs are per shop", async () => {
    expect((await a.client.from("voucher_designs").upsert({ tenant_id: a.tenantId, layout: "ticket", size: "a6" })).error).toBeNull();
    expect((await b.client.from("voucher_designs").select("layout").eq("tenant_id", a.tenantId)).data).toEqual([]);
    expect((await b.client.from("voucher_designs").upsert({ tenant_id: a.tenantId, layout: "minimal" })).error).not.toBeNull();
    expect((await a.client.from("voucher_designs").upsert({ tenant_id: a.tenantId, layout: "fancy" })).error).not.toBeNull();
    expect((await db.from("voucher_designs").select("layout").eq("tenant_id", a.tenantId).single()).data?.layout).toBe("ticket");
  });
});
