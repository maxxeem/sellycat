/**
 * Partner code for the redemption app against staging: either scanners or one code per partner,
 * stored as a hash only, and a code session finds and redeems that partner's vouchers only.
 */
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `pc${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe.skipIf(!rlsEnabled)("partner code", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let mine: string;
  let other: string;
  let scanner: string;
  const v: Record<string, { id: string; token: string; code: string }> = {};

  async function voucher(t: TestTenant, partner: string | null, tag: string) {
    await db.from("legal_pages").upsert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: t.tenantId, kind, content: LEGAL })), { onConflict: "tenant_id,kind" });
    const deal = (await db.from("deals").insert({ tenant_id: t.tenantId, slug: tag, title: tag, price_cents: 1000, state: "published", partner_id: partner } as never).select("id").single()).data!.id;
    const order = (await db.rpc("start_checkout", { p_deal: deal, p_qty: 1, p_email: `${tag}@${run}.test`, p_name: "T", p_newsletter: false, p_locale: "de", p_minutes: 35 })).data![0].order_id;
    await db.from("orders").update({ stripe_session_id: `cs_${run}${tag}` }).eq("id", order);
    await db.rpc("fulfil_order", { p_session: `cs_${run}${tag}`, p_payment_intent: "" });
    v[tag] = (await db.from("vouchers").select("id, token, code").eq("order_id", order).single()).data!;
  }
  const set = async (partner: string, code: string, t = a) => (await db.rpc("partner_code_set", { p_tenant: t.tenantId, p_partner: partner, p_code: code })).data;
  const match = async (code: string, t = a) => (await db.rpc("partner_code_match", { p_tenant: t.tenantId, p_code: code })).data;
  const find = async (code: string | null, token: string | null = null, t = a, partner = mine) => (await db.rpc("scan_find_partner", { p_tenant: t.tenantId, p_partner: partner, p_code: code as string, p_token: token as string })).data as Record<string, string>;
  const redeem = async (id: string, t = a, partner = mine) => (await db.rpc("scan_redeem_partner", { p_tenant: t.tenantId, p_partner: partner, p_voucher: id })).data as { ok: boolean; error?: string };
  const session = async (partner: string) => {
    const hash = sha(randomBytes(16).toString("hex"));
    expect((await db.from("scan_sessions").insert({ token_hash: hash, tenant_id: a.tenantId, partner_id: partner, host: "deals.a.test", expires_at: new Date(Date.now() + 3_600_000).toISOString() })).error).toBeNull();
    return hash;
  };
  const use = async (hash: string) => (await db.rpc("scan_session_use", { p_hash: hash, p_tenant: a.tenantId, p_host: "deals.a.test" })).data ?? [];

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    mine = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Mein Partner" }).select("id").single()).data!.id;
    other = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Anderer" }).select("id").single()).data!.id;
    await voucher(a, mine, "mine");
    await voucher(a, other, "foreign");
    await voucher(a, null, "shop");
    await voucher(b, null, "shopb");
    scanner = (await db.auth.admin.createUser({ email: `s-${run}@example.com`, email_confirm: true })).data.user!.id;
    await db.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: scanner, role: "partner", partner_id: mine });
  }, 90_000);
  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
    if (scanner) await db.auth.admin.deleteUser(scanner);
  });

  it("is invisible to every client", async () => {
    for (const c of [a.client, anon()]) {
      expect((await c.from("partner_scan_codes").select("partner_id")).error).not.toBeNull();
      for (const [fn, args] of [
        ["partner_code_set", { p_tenant: a.tenantId, p_partner: mine, p_code: "12345678" }],
        ["partner_code_clear", { p_tenant: a.tenantId, p_partner: mine }],
        ["partner_code_match", { p_tenant: a.tenantId, p_code: "12345678" }],
        ["scan_find_partner", { p_tenant: a.tenantId, p_partner: mine, p_code: "x", p_token: "x" }],
        ["scan_redeem_partner", { p_tenant: a.tenantId, p_partner: mine, p_voucher: v.mine.id }],
        ["partner_uses_code", { p_partner: mine }],
      ] as const)
        expect((await c.rpc(fn as never, args as never)).error, fn).not.toBeNull();
    }
  });

  it("sets a code as a hash, unique in the shop, and removes the partner's scanners", async () => {
    expect((await db.rpc("redeem_user_id", { p_tenant: a.tenantId, p_email: `s-${run}@example.com` })).data).toBe(scanner);
    expect(await set(mine, "1234567")).toBe("invalid");
    expect(await set(mine, "abcdefgh")).toBe("invalid");
    expect(await set(mine, "MEIN2026CODE")).toBe("ok");
    expect(await set(other, "MEIN2026CODE")).toBe("taken");
    expect(await set(mine, "MEIN2026CODE", b)).toBe("not_found");
    const { data: row } = await db.from("partner_scan_codes").select("code_hash").eq("partner_id", mine).single();
    expect(row!.code_hash).not.toContain("MEIN2026CODE");
    expect((await db.from("tenant_members").select("user_id").eq("tenant_id", a.tenantId).eq("role", "partner")).data).toEqual([]);
    expect(await match("MEIN2026CODE")).toBe(mine);
    expect(await match("MEIN2026CODX")).toBeNull();
    expect(await match("MEIN2026CODE", b)).toBeNull();
  });

  it("locks out scanners of a partner on a code", async () => {
    await db.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: scanner, role: "partner", partner_id: mine });
    expect((await db.rpc("scan_member", { p_tenant: a.tenantId, p_user: scanner })).data).toBe(false);
    expect((await db.rpc("redeem_user_id", { p_tenant: a.tenantId, p_email: `s-${run}@example.com` })).data).toBeNull();
    await db.from("tenant_members").delete().eq("tenant_id", a.tenantId).eq("user_id", scanner);
  });

  it("finds and redeems only this partner's vouchers in this shop", async () => {
    expect(await find(v.mine.code)).toEqual({ id: v.mine.id });
    expect(await find(null, v.mine.token)).toEqual({ id: v.mine.id });
    expect(await find(v.foreign.code)).toEqual({ partner: "Anderer" });
    expect(await find(v.shop.code)).toEqual({ partner: "" });
    expect(await find(v.shopb.code)).toEqual({});
    expect(await find(null, v.shopb.token)).toEqual({});
    expect(await find(v.mine.code, null, a, other)).toEqual({ error: "forbidden" });
    expect(await redeem(v.foreign.id)).toMatchObject({ ok: false, error: "not_found" });
    expect(await redeem(v.shopb.id)).toMatchObject({ ok: false, error: "not_found" });
    expect(await redeem(v.mine.id)).toMatchObject({ ok: true });
    expect(await redeem(v.mine.id)).toMatchObject({ ok: false, error: "redeemed" });
    const { data } = await db.from("redemptions").select("user_id, source, partner_id").eq("voucher_id", v.mine.id);
    expect(data).toEqual([{ user_id: null, source: "pwa", partner_id: mine }]);
  }, 30_000);

  it("ends sessions when the code changes or is removed", async () => {
    const first = await session(mine);
    expect(await use(first)).toEqual([{ user_id: null, email: null, partner_id: mine, partner_name: "Mein Partner" }]);
    expect(await set(mine, "NEUERCODE1")).toBe("ok");
    expect(await use(first)).toEqual([]);
    expect(await match("MEIN2026CODE")).toBeNull();
    const second = await session(mine);
    expect(await use(second)).toHaveLength(1);
    await db.rpc("partner_code_clear", { p_tenant: a.tenantId, p_partner: mine });
    expect(await use(second)).toEqual([]);
    expect(await match("NEUERCODE1")).toBeNull();
    expect(await find(v.mine.code)).toEqual({ error: "forbidden" });
    // A session without a code row never works.
    expect(await use(await session(other))).toEqual([]);
  });
});
