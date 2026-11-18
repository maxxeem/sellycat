/**
 * Authorised scanners against staging: a partner's scanner may redeem only that partner's
 * vouchers of that shop - never another partner's, never another shop's.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { admin, anon, anonKey, dropTenant, makeTenant, rlsEnabled, url, type DB, type TestTenant } from "./helpers";

const run = `s${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS scanners", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let scanner: DB;
  let scannerId: string;
  const vouchers: Record<"mine" | "otherPartner" | "otherShop", { id: string; token: string; code: string }> = {} as never;

  async function voucherFor(tenant: TestTenant, partnerId: string | null, tag: string) {
    await db.from("legal_pages").upsert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: tenant.tenantId, kind, content: LEGAL })), { onConflict: "tenant_id,kind" });
    const deal = (await db.from("deals").insert({ tenant_id: tenant.tenantId, slug: `d-${tag}`, title: `Deal ${tag}`, price_cents: 1000, state: "published", partner_id: partnerId }).select("id").single()).data!.id;
    const start = await db.rpc("start_checkout", { p_deal: deal, p_qty: 1, p_email: `b-${tag}@${run}.test`, p_name: "T", p_newsletter: false, p_locale: "de", p_minutes: 35 });
    const order = start.data![0].order_id;
    await db.from("orders").update({ stripe_session_id: `cs_${run}_${tag}` }).eq("id", order);
    await db.rpc("fulfil_order", { p_session: `cs_${run}_${tag}`, p_payment_intent: `pi_${run}_${tag}` });
    return (await db.from("vouchers").select("id, token, code").eq("order_id", order).single()).data!;
  }

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}a`);
    b = await makeTenant(db, `${run}b`);
    const p1 = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Partner Eins" }).select("id").single()).data!.id;
    const p2 = (await db.from("partners").insert({ tenant_id: a.tenantId, name: "Partner Zwei" }).select("id").single()).data!.id;
    vouchers.mine = await voucherFor(a, p1, "mine");
    vouchers.otherPartner = await voucherFor(a, p2, "other");
    vouchers.otherShop = await voucherFor(b, null, "shopb");
    const email = `scanner-${run}@example.com`;
    const password = `Scan-${run}-pw!`;
    scannerId = (await db.auth.admin.createUser({ email, password, email_confirm: true })).data.user!.id;
    await db.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: scannerId, role: "partner", partner_id: p1 });
    scanner = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    await scanner.auth.signInWithPassword({ email, password });
  }, 90_000);

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
    if (scannerId) await db.auth.admin.deleteUser(scannerId);
  });

  it("a scanner may use the redemption app of its shop only", async () => {
    expect((await scanner.rpc("can_use_redeem", { p_tenant: a.tenantId })).data).toBe(true);
    expect((await scanner.rpc("can_use_redeem", { p_tenant: b.tenantId })).data).toBe(false);
  });

  it("finds its partner's voucher by QR token or code, not another partner's or shop's", async () => {
    expect((await scanner.rpc("find_voucher_by_token", { p_tenant: a.tenantId, p_token: vouchers.mine.token })).data).toBe(vouchers.mine.id);
    expect((await scanner.rpc("find_voucher", { p_tenant: a.tenantId, p_code: vouchers.mine.code })).data).toBe(vouchers.mine.id);
    expect((await scanner.rpc("find_voucher_by_token", { p_tenant: a.tenantId, p_token: vouchers.otherPartner.token })).data).toBeNull();
    expect((await scanner.rpc("find_voucher_by_token", { p_tenant: b.tenantId, p_token: vouchers.otherShop.token })).data).toBeNull();
    // A token of shop B presented to shop A is not found either.
    expect((await scanner.rpc("find_voucher_by_token", { p_tenant: a.tenantId, p_token: vouchers.otherShop.token })).data).toBeNull();
  });

  it("names the partner of another partner's voucher, nothing for its own, other shops or strangers", async () => {
    const hint = (c: DB, tenant: string, code: string, token = "") => c.rpc("voucher_partner_hint", { p_tenant: tenant, p_code: code, p_token: token }).then((r) => r.data);
    expect(await hint(scanner, a.tenantId, vouchers.otherPartner.code)).toBe("Partner Zwei");
    expect(await hint(scanner, a.tenantId, "", vouchers.otherPartner.token)).toBe("Partner Zwei");
    expect(await hint(scanner, a.tenantId, vouchers.mine.code)).toBeNull();
    expect(await hint(scanner, a.tenantId, vouchers.otherShop.code)).toBeNull();
    expect(await hint(scanner, b.tenantId, vouchers.otherShop.code)).toBeNull();
    expect((await anon().rpc("voucher_partner_hint", { p_tenant: a.tenantId, p_code: vouchers.otherPartner.code, p_token: "" })).data ?? null).toBeNull();
  });

  it("redeems its partner's voucher once, others never", async () => {
    expect((await scanner.rpc("redeem_voucher", { p_voucher: vouchers.otherPartner.id, p_source: "pwa" })).data).toMatchObject({ ok: false, error: "forbidden" });
    expect((await scanner.rpc("redeem_voucher", { p_voucher: vouchers.otherShop.id, p_source: "pwa" })).data).toMatchObject({ ok: false, error: "forbidden" });
    expect((await scanner.rpc("redeem_voucher", { p_voucher: vouchers.mine.id, p_source: "pwa" })).data).toMatchObject({ ok: true });
    expect((await scanner.rpc("redeem_voucher", { p_voucher: vouchers.mine.id, p_source: "pwa" })).data).toMatchObject({ ok: false, error: "redeemed" });
  });

  it("the email lookup for invitations is server-only", async () => {
    expect((await scanner.rpc("auth_user_id" as never, { p_email: "x@example.com" } as never)).error).not.toBeNull();
    expect((await anon().rpc("auth_user_id" as never, { p_email: "x@example.com" } as never)).error).not.toBeNull();
  });
});
