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

  it("a code in one deal's pool is refused in another, and leaves no phantom stock", async () => {
    const other = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "pool2", title: "Pool 2", price_cents: 1000, code_source: "pool" }).select("id").single()).data!.id;
    await a.client.rpc("import_pool_codes", { p_deal: dealId, p_codes: ["Q-1"] });
    expect((await a.client.rpc("import_pool_codes", { p_deal: other, p_codes: ["Q-1", "Q-2"] })).data).toMatchObject({ added: 1, skipped: 1 });
    // Old data may hold the same code twice: once handed out it is no stock elsewhere.
    await db.from("code_pool").insert({ tenant_id: a.tenantId, deal_id: other, code: "Q-1" });
    const o = (await checkout(1, `dup@${run}.test`)).data![0].order_id;
    await db.from("orders").update({ stripe_session_id: `cs_${run}d` }).eq("id", o);
    await db.rpc("fulfil_order", { p_session: `cs_${run}d`, p_payment_intent: "" });
    expect((await db.from("vouchers").select("code").eq("order_id", o)).data).toEqual([{ code: "Q-1" }]);
    expect((await db.from("deals").select("pool_free").eq("id", other).single()).data!.pool_free).toBe(1);
  });

  it("publishing needs codes", async () => {
    const draft = async (slug: string, source: "pool" | "shared") => (await db.from("deals").insert({ tenant_id: a.tenantId, slug, title: slug, price_cents: 1000, code_source: source }).select("id").single()).data!.id;
    const pool = await draft("pub-pool", "pool");
    expect((await a.client.from("deals").update({ state: "published" }).eq("id", pool)).error?.message).toContain("codes missing");
    await a.client.rpc("import_pool_codes", { p_deal: pool, p_codes: ["PUB-1"] });
    expect((await a.client.from("deals").update({ state: "published" }).eq("id", pool)).error).toBeNull();
    const shared = await draft("pub-shared", "shared");
    expect((await a.client.from("deals").update({ state: "published" }).eq("id", shared)).error?.message).toContain("codes missing");
  });

  it("shared code: hidden from others, the same for every buyer, single vouchers stay apart", async () => {
    const id = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "shared", title: "Shared", price_cents: 1000, code_source: "shared", code_format: "qr", total_qty: 3 }).select("id").single()).data!.id;
    expect((await b.client.from("deal_shared_codes").insert({ deal_id: id, tenant_id: b.tenantId, code: "EVIL" })).error).not.toBeNull();
    expect((await b.client.from("deal_shared_codes").insert({ deal_id: id, tenant_id: a.tenantId, code: "EVIL" })).error).not.toBeNull();
    expect((await a.client.from("deal_shared_codes").upsert({ deal_id: id, tenant_id: a.tenantId, code: "SOMMER 50" }, { onConflict: "deal_id" })).error).toBeNull();
    expect((await a.client.from("deals").update({ state: "published" }).eq("id", id)).error).toBeNull();
    expect((await b.client.from("deal_shared_codes").select("code").eq("deal_id", id)).data).toEqual([]);
    expect((await anon().from("deal_shared_codes").select("code").eq("deal_id", id)).data ?? []).toEqual([]);
    const buy = async (n: number, qty: number) => {
      const r = await db.rpc("start_checkout", { p_deal: id, p_qty: qty, p_email: `s${n}@${run}.test`, p_name: "T", p_newsletter: false, p_locale: "de", p_minutes: 35 });
      if (r.error) return r.error.message;
      await db.from("orders").update({ stripe_session_id: `cs_${run}s${n}` }).eq("id", r.data![0].order_id);
      await db.rpc("fulfil_order", { p_session: `cs_${run}s${n}`, p_payment_intent: "" });
      return r.data![0].order_id;
    };
    const first = await buy(1, 2);
    await buy(2, 1);
    expect(await buy(3, 1)).toContain("checkout:sold_out");
    const { data: vs } = await db.from("vouchers").select("id, code, token, shared_code").eq("deal_id", id);
    expect(vs!.map((v) => v.code)).toEqual(["SOMMER 50", "SOMMER 50", "SOMMER 50"]);
    expect(new Set(vs!.map((v) => v.token)).size).toBe(3);
    expect((await db.from("orders").select("oversold").eq("id", first).single()).data!.oversold).toBe(false);
    // The code names no single voucher; the QR token does.
    expect((await a.client.rpc("find_voucher", { p_tenant: a.tenantId, p_code: "sommer50" })).data).toBeNull();
    expect((await a.client.rpc("shared_code_hint", { p_tenant: a.tenantId, p_code: "sommer50" })).data).toBe("qr");
    expect((await b.client.rpc("shared_code_hint", { p_tenant: a.tenantId, p_code: "sommer50" })).data).toBeNull();
    expect((await anon().rpc("shared_code_hint", { p_tenant: a.tenantId, p_code: "sommer50" })).error).not.toBeNull();
    expect((await db.rpc("api_redeem_voucher", { p_tenant: a.tenantId, p_key: null as never, p_code: "SOMMER50" })).data).toMatchObject({ ok: false, error: "shared_code" });
    const one = (await a.client.rpc("find_voucher_by_token", { p_tenant: a.tenantId, p_token: vs![0].token })).data as string;
    expect((await a.client.rpc("redeem_voucher", { p_voucher: one })).data).toMatchObject({ ok: true });
    expect((await db.from("vouchers").select("id").eq("deal_id", id).eq("status", "valid")).data).toHaveLength(2);
    // Individual codes stay unique.
    const { data: ref } = await db.from("vouchers").select("order_id").eq("id", one).single();
    const ins = () => db.from("vouchers").insert({ tenant_id: a.tenantId, order_id: ref!.order_id, title: "x", code_format: "qr", code: `UNI-${run}`, token: `tok-${Math.random().toString(36).slice(2)}-${run}-000000` });
    expect((await ins()).error).toBeNull();
    expect((await ins()).error?.code).toBe("23505");
  }, 60_000);

  it("an order without own codes left is flagged instead of silently getting a generated code", async () => {
    const id = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "flag", title: "Flag", price_cents: 1000, code_source: "pool" }).select("id").single()).data!.id;
    const buyer = (await db.from("buyers").select("id").eq("tenant_id", a.tenantId).limit(1).single()).data!.id;
    const order = (await db.from("orders").insert({ tenant_id: a.tenantId, buyer_id: buyer, number: `F-${run}`, status: "paid", email: `f@${run}.test`, currency: "CHF", amount_cents: 1000 }).select("id").single()).data!.id;
    await db.from("order_items").insert({ tenant_id: a.tenantId, order_id: order, deal_id: id, title: "Flag", qty: 1, unit_cents: 1000, total_cents: 1000 });
    expect((await db.rpc("issue_vouchers", { p_order: order })).data).toBe(1);
    expect((await db.from("orders").select("oversold").eq("id", order).single()).data!.oversold).toBe(true);
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
