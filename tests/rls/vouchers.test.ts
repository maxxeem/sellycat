/**
 * Phase 4 against the real staging database: vouchers are issued once per paid order, codes have
 * the deal's format, a voucher is never redeemed twice (also in parallel), partial value use,
 * windows, undo, refunds, roles, and nothing crosses tenants. Skipped without credentials.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { admin, anon, anonKey, dropTenant, makeTenant, rlsEnabled, url, type DB, type TestTenant } from "./helpers";

const run = `v${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

const gs1Valid = (digits: string) => {
  const body = digits.slice(0, -1);
  let s = 0;
  for (let i = 1; i <= body.length; i++) s += Number(body[body.length - i]) * (i % 2 ? 3 : 1);
  return (10 - (s % 10)) % 10 === Number(digits.at(-1));
};

describe.skipIf(!rlsEnabled)("RLS vouchers", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let redeemer: { userId: string; client: DB };
  const deals: Record<string, string> = {};
  const orders: Record<string, string> = {};

  const buy = async (key: string, qty: number) => {
    const r = await db.rpc("start_checkout", { p_deal: deals[key], p_qty: qty, p_email: `${key}@example.com`, p_name: "Test", p_newsletter: false, p_locale: "de", p_minutes: 35 });
    if (r.error) throw r.error;
    const orderId = r.data![0].order_id;
    const session = `cs_${run}_${key}`;
    await db.from("orders").update({ stripe_session_id: session }).eq("id", orderId);
    await db.rpc("fulfil_order", { p_session: session, p_payment_intent: `pi_${run}_${key}` });
    orders[key] = orderId;
    return (await db.from("vouchers").select("*").eq("order_id", orderId).order("created_at")).data!;
  };

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}-a`);
    b = await makeTenant(db, `${run}-b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    // Zurich weekday (1 = Monday) and a window of one minute just after midnight two days later.
    const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Date().toLocaleString("en-US", { timeZone: "Europe/Zurich", weekday: "short" })) + 1;
    const otherDay = ((weekday + 1) % 7) + 1;
    const rows = [
      { key: "fixed", title: "Fixed", price_cents: 2000, code_format: "qr" as const },
      { key: "value", title: "Value", price_cents: 4000, deal_type: "value" as const, value_cents: 5000, partial_redemption: true, code_format: "numeric" as const },
      { key: "ean", title: "EAN", price_cents: 1000, code_format: "barcode" as const, barcode_type: "ean13" as const, redeem_validity: "days_after_purchase" as const, redeem_days: 30 },
      { key: "window", title: "Window", price_cents: 1000, redeem_windows: [{ days: [otherDay], from: "00:00", to: "00:01" }] },
    ];
    for (const { key, ...row } of rows) {
      const { data, error } = await db.from("deals").insert({ tenant_id: a.tenantId, slug: key, state: "published", ...row }).select("id").single();
      if (error) throw error;
      deals[key] = data.id;
    }
    // A second person in shop A who may only redeem.
    const email = `rls-${run}-r@example.com`;
    const password = `Rls-${run}-pw!`;
    const { data: user } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    await db.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: user.user!.id, role: "redeemer" });
    const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email, password });
    redeemer = { userId: user.user!.id, client };
  });

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
    if (redeemer) await db.auth.admin.deleteUser(redeemer.userId);
  });

  it("issues one voucher per item, once, in the deal's format", async () => {
    const fixed = await buy("fixed", 3);
    expect(fixed).toHaveLength(3);
    expect(fixed[0].code).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(new Set(fixed.map((v) => v.token)).size).toBe(3);
    expect(fixed[0].token.length).toBeGreaterThanOrEqual(22);
    expect((await db.rpc("issue_vouchers", { p_order: orders.fixed })).data).toBe(0);

    const [value] = await buy("value", 1);
    expect(value).toMatchObject({ value_cents: 5000, remaining_cents: 5000, partial: true });
    expect(value.code).toMatch(/^\d{4} \d{4} \d{4}$/);

    const [ean] = await buy("ean", 1);
    expect(ean.code).toMatch(/^2\d{12}$/);
    expect(gs1Valid(ean.code)).toBe(true);
    expect(new Date(ean.valid_until!).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
  });

  it("redeems a voucher exactly once, also when tried in parallel", async () => {
    const vouchers = (await db.from("vouchers").select("id").eq("order_id", orders.fixed)).data!;
    const first = await a.client.rpc("redeem_voucher", { p_voucher: vouchers[0].id });
    expect(first.data).toMatchObject({ ok: true });
    expect((await a.client.rpc("redeem_voucher", { p_voucher: vouchers[0].id })).data).toMatchObject({ ok: false, error: "redeemed" });

    const race = await Promise.all(Array.from({ length: 5 }, () => a.client.rpc("redeem_voucher", { p_voucher: vouchers[1].id })));
    expect(race.filter((r) => (r.data as { ok: boolean } | null)?.ok)).toHaveLength(1);
    expect((await db.from("redemptions").select("id").eq("voucher_id", vouchers[1].id)).data).toHaveLength(1);
  });

  it("uses value vouchers in parts and can undo", async () => {
    const [v] = (await db.from("vouchers").select("id").eq("order_id", orders.value)).data!;
    expect((await a.client.rpc("redeem_voucher", { p_voucher: v.id, p_amount: 2000 })).data).toMatchObject({ ok: true, remaining: 3000 });
    expect((await a.client.rpc("redeem_voucher", { p_voucher: v.id, p_amount: 4000 })).data).toMatchObject({ ok: false, error: "amount" });
    expect((await a.client.rpc("redeem_voucher", { p_voucher: v.id, p_amount: 3000 })).data).toMatchObject({ ok: true, remaining: 0 });
    expect((await db.from("vouchers").select("status").eq("id", v.id).single()).data?.status).toBe("redeemed");

    const { data: last } = await db.from("redemptions").select("id").eq("voucher_id", v.id).order("created_at", { ascending: false }).limit(1).single();
    expect((await redeemer.client.rpc("undo_redemption", { p_redemption: last!.id })).data).toMatchObject({ ok: false, error: "forbidden" });
    expect((await a.client.rpc("undo_redemption", { p_redemption: last!.id })).data).toMatchObject({ ok: true });
    expect((await a.client.rpc("undo_redemption", { p_redemption: last!.id })).data).toMatchObject({ ok: false, error: "already_undone" });
    expect((await db.from("vouchers").select("status, remaining_cents").eq("id", v.id).single()).data).toEqual({ status: "valid", remaining_cents: 3000 });
  });

  it("respects redemption windows and roles", async () => {
    const [w] = await buy("window", 1);
    expect((await a.client.rpc("redeem_voucher", { p_voucher: w.id })).data).toMatchObject({ ok: false, error: "outside_window" });
    // Vouchers of one order share created_at: pick one that is still unused.
    const [third] = (await db.from("vouchers").select("id, code").eq("order_id", orders.fixed).eq("status", "valid").order("code")).data!;
    expect((await redeemer.client.rpc("find_voucher", { p_tenant: a.tenantId, p_code: third.code.toLowerCase().replace(/-/g, " ") })).data).toBe(third.id);
    expect((await redeemer.client.rpc("redeem_voucher", { p_voucher: third.id })).data).toMatchObject({ ok: true });
  });

  it("keeps vouchers and redemptions inside their tenant", async () => {
    const [v] = (await db.from("vouchers").select("id, code, token").eq("order_id", orders.ean)).data!;
    for (const table of ["vouchers", "redemptions", "code_pool"] as const) {
      expect((await b.client.from(table).select("tenant_id").eq("tenant_id", a.tenantId)).data, table).toEqual([]);
      expect((await anon().from(table).select("tenant_id").eq("tenant_id", a.tenantId)).data, table).toEqual([]);
    }
    expect((await b.client.rpc("redeem_voucher", { p_voucher: v.id })).data).toMatchObject({ ok: false, error: "forbidden" });
    expect((await b.client.rpc("find_voucher", { p_tenant: a.tenantId, p_code: v.code })).data).toBeNull();
    expect((await anon().rpc("redeem_voucher", { p_voucher: v.id })).error).not.toBeNull();
    expect((await a.client.from("vouchers").update({ status: "redeemed" }).eq("id", v.id).select("id")).data ?? []).toEqual([]);

    const { data: pub } = await anon().rpc("voucher_public", { p_token: v.token });
    expect(pub?.[0]).toMatchObject({ tenant_id: a.tenantId, title: "EAN", status: "valid", code: v.code });
    expect((await anon().rpc("voucher_public", { p_token: "short" })).data).toEqual([]);
  });

  it("a full refund takes unused vouchers out", async () => {
    await db.rpc("record_refund", { p_payment_intent: `pi_${run}_ean`, p_refunded: 1000 });
    const [v] = (await db.from("vouchers").select("id, status").eq("order_id", orders.ean)).data!;
    expect(v.status).toBe("refunded");
    expect((await a.client.rpc("redeem_voucher", { p_voucher: v.id })).data).toMatchObject({ ok: false, error: "refunded" });
  });
});
