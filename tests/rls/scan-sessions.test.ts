/**
 * Redemption app sessions against staging: one shop, one host, nothing but finding and redeeming,
 * and only as long as the person is allowed there.
 */
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `ss${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe.skipIf(!rlsEnabled)("scan sessions", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let worker: string;
  let partnerA: string;
  const v: Record<string, { id: string; token: string; code: string }> = {};

  async function voucher(t: TestTenant, partner: string | null, tag: string, extra: Record<string, unknown> = {}) {
    await db.from("legal_pages").upsert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: t.tenantId, kind, content: LEGAL })), { onConflict: "tenant_id,kind" });
    const deal = (await db.from("deals").insert({ tenant_id: t.tenantId, slug: tag, title: tag, price_cents: 1000, state: "published", partner_id: partner, ...extra } as never).select("id").single()).data!.id;
    const order = (await db.rpc("start_checkout", { p_deal: deal, p_qty: 1, p_email: `${tag}@${run}.test`, p_name: "T", p_newsletter: false, p_locale: "de", p_minutes: 35 })).data![0].order_id;
    await db.from("orders").update({ stripe_session_id: `cs_${run}${tag}` }).eq("id", order);
    await db.rpc("fulfil_order", { p_session: `cs_${run}${tag}`, p_payment_intent: "" });
    v[tag] = (await db.from("vouchers").select("id, token, code").eq("order_id", order).single()).data!;
  }
  const start = async (t: TestTenant, user: string, host: string, hours = 24) => {
    const hash = sha(randomBytes(16).toString("hex"));
    expect((await db.from("scan_sessions").insert({ token_hash: hash, tenant_id: t.tenantId, user_id: user, host, expires_at: new Date(Date.now() + hours * 3_600_000).toISOString() })).error).toBeNull();
    return hash;
  };
  const use = async (hash: string, t: TestTenant, host: string) => (await db.rpc("scan_session_use", { p_hash: hash, p_tenant: t.tenantId, p_host: host })).data ?? [];
  const find = async (t: TestTenant, code: string | null, token: string | null = null) => (await db.rpc("scan_find", { p_tenant: t.tenantId, p_user: worker, p_code: code as string, p_token: token as string })).data as Record<string, string>;
  const redeem = async (t: TestTenant, id: string, amount?: number) => (await db.rpc("scan_redeem", { p_tenant: t.tenantId, p_user: worker, p_voucher: id, p_amount: amount })).data as { ok: boolean; error?: string; remaining?: number };

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    await db.from("tenants").update({ plan_id: "business" }).eq("id", a.tenantId);
    partnerA = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Mein Partner" }).select("id").single()).data!.id;
    const other = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Anderer" }).select("id").single()).data!.id;
    await voucher(a, partnerA, "mine");
    await voucher(a, other, "foreign");
    await voucher(a, partnerA, "value", { deal_type: "value", value_cents: 5000, partial_redemption: true });
    await voucher(b, null, "shopb");
    // Works as a scanner for shop A and as admin of shop B (the case this is about).
    worker = (await db.auth.admin.createUser({ email: `w-${run}@example.com`, email_confirm: true })).data.user!.id;
    await db.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: worker, role: "partner", partner_id: partnerA });
    await db.from("tenant_members").insert({ tenant_id: b.tenantId, user_id: worker, role: "admin" });
  }, 90_000);
  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
    if (worker) await db.auth.admin.deleteUser(worker);
  });

  it("is invisible to every client", async () => {
    for (const c of [a.client, anon()]) {
      expect((await c.from("scan_sessions").select("id")).error).not.toBeNull();
      for (const [fn, args] of [
        ["scan_session_use", { p_hash: "x", p_tenant: a.tenantId, p_host: "h" }],
        ["scan_find", { p_tenant: a.tenantId, p_user: worker, p_code: "x", p_token: "x" }],
        ["scan_redeem", { p_tenant: a.tenantId, p_user: worker, p_voucher: v.mine.id }],
        ["scan_become", { p_user: worker }],
        ["scan_member", { p_tenant: a.tenantId, p_user: worker }],
      ] as const)
        expect((await c.rpc(fn as never, args as never)).error, fn).not.toBeNull();
    }
  });

  it("is good for its shop and host only, until it expires", async () => {
    const hash = await start(a, worker, "deals.a.test");
    expect(await use(hash, a, "deals.a.test")).toEqual([{ user_id: worker, email: `w-${run}@example.com`, partner_id: null, partner_name: null }]);
    expect(await use(hash, a, "other.test")).toEqual([]);
    expect(await use(hash, b, "deals.a.test")).toEqual([]);
    expect(await use("0".repeat(64), a, "deals.a.test")).toEqual([]);
    expect(await use(await start(a, worker, "deals.a.test", -1), a, "deals.a.test")).toEqual([]);
  });

  it("finds and redeems with the rights in this shop, not those elsewhere", async () => {
    expect(await find(a, v.mine.code)).toEqual({ id: v.mine.id });
    expect(await find(a, null, v.mine.token)).toEqual({ id: v.mine.id });
    expect(await find(a, v.foreign.code)).toEqual({ partner: "Anderer" });
    // Admin of shop B, but this is shop A.
    expect(await find(a, v.shopb.code)).toEqual({});
    expect(await find(a, null, v.shopb.token)).toEqual({});
    expect(await redeem(a, v.shopb.id)).toMatchObject({ ok: false, error: "not_found" });
    expect(await redeem(a, v.foreign.id)).toMatchObject({ ok: false, error: "forbidden" });
    expect(await redeem(a, v.value.id, 2000)).toMatchObject({ ok: true, remaining: 3000 });
    expect(await redeem(a, v.mine.id)).toMatchObject({ ok: true });
    expect(await redeem(a, v.mine.id)).toMatchObject({ ok: false, error: "redeemed" });
    const { data } = await db.from("redemptions").select("user_id, source, partner_id").eq("voucher_id", v.mine.id);
    expect(data).toEqual([{ user_id: worker, source: "pwa", partner_id: partnerA }]);
    // Parallel swipes redeem once.
    await voucher(a, partnerA, "race");
    const both = await Promise.all([redeem(a, v.race.id), redeem(a, v.race.id)]);
    expect(both.map((r) => r.ok).sort()).toEqual([false, true]);
  }, 30_000);

  it("leaves nothing behind for the next call", async () => {
    await find(a, v.mine.code);
    expect((await db.from("tenants").select("id").in("id", [a.tenantId, b.tenantId])).data).toHaveLength(2);
    expect((await db.from("scan_sessions").select("id").eq("tenant_id", a.tenantId)).error).toBeNull();
  });

  it("ends the moment the person is removed from the shop", async () => {
    const hash = await start(a, worker, "deals.a.test");
    expect(await use(hash, a, "deals.a.test")).toHaveLength(1);
    await db.from("tenant_members").delete().eq("tenant_id", a.tenantId).eq("user_id", worker);
    expect(await use(hash, a, "deals.a.test")).toEqual([]);
    expect(await find(a, v.value.code)).toEqual({ error: "forbidden" });
    expect(await redeem(a, v.value.id, 100)).toMatchObject({ ok: false, error: "forbidden" });
  });

  it("gives staff no extra rights", async () => {
    await db.from("platform_staff").insert({ user_id: worker, role: "support" });
    try {
      expect(await find(a, v.value.code)).toEqual({ error: "forbidden" });
      expect(await find(b, v.value.code)).toEqual({});
      expect(await redeem(b, v.value.id)).toMatchObject({ ok: false, error: "not_found" });
    } finally {
      await db.from("platform_staff").delete().eq("user_id", worker);
    }
  });
});
