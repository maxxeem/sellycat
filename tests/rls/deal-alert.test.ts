/**
 * Deal alert against staging: plan feature, privacy of the subscriber list across shops, and the
 * queue (only deals that go live after switching on, once, only to confirmed addresses).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `da${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

describe.skipIf(!rlsEnabled)("RLS deal alert", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  const deals: Record<string, string> = {};
  const due = async () => {
    const ids = (await db.rpc("deal_alert_due")).data as unknown as string[];
    return Object.entries(deals).filter(([, id]) => ids.includes(id)).map(([k]) => k).sort();
  };

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    b = await makeTenant(db, `${run}b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    const stripe = await db.from("stripe_accounts").insert({ tenant_id: a.tenantId, account_id: `acct_${run}`, charges_enabled: true } as never);
    expect(stripe.error).toBeNull();
    const subs = await db.from("deal_alert_subscribers").insert([
      { tenant_id: a.tenantId, email: `yes-${run}@example.com`, status: "confirmed", token: `yes-${run}` },
      { tenant_id: a.tenantId, email: `pending-${run}@example.com`, status: "pending", token: `pending-${run}` },
      { tenant_id: b.tenantId, email: `other-${run}@example.com`, status: "confirmed", token: `other-${run}` },
    ]);
    expect(subs.error).toBeNull();
  }, 60_000);
  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("is a feature of Pro and Business", async () => {
    const { data } = await db.from("plans").select("id, limits");
    expect((data ?? []).filter((p) => (p.limits as { deal_alert?: boolean }).deal_alert).map((p) => p.id).sort()).toEqual(["business", "pro"]);
  });

  it("the owner sees the own list without tokens, nobody else sees anything", async () => {
    expect((await a.client.from("deal_alert_subscribers").select("email")).data?.map((r) => r.email).sort()).toEqual([`pending-${run}@example.com`, `yes-${run}@example.com`]);
    expect((await a.client.from("deal_alert_subscribers").select("token")).error).not.toBeNull();
    expect((await anon().from("deal_alert_subscribers").select("email")).error).not.toBeNull();
    expect((await a.client.from("deal_alert_subscribers").insert({ tenant_id: a.tenantId, email: "x@example.com", token: "x" })).error).not.toBeNull();
    expect((await a.client.from("deal_alert_sends").select("alert_id")).error).not.toBeNull();
    expect((await a.client.from("deal_alert_tick").select("token")).error).not.toBeNull();
    for (const fn of ["deal_alert_start", "deal_alert_wake"] as const) expect((await a.client.rpc(fn)).error, fn).not.toBeNull();
    expect((await a.client.rpc("deal_alert_claim", { p_limit: 5 })).error).not.toBeNull();
    expect((await a.client.rpc("deal_alert_history", { p_tenant: b.tenantId })).data).toEqual([]);
  });

  it("only the server switches it on", async () => {
    expect((await a.client.from("tenants").update({ deal_alert_at: new Date().toISOString() }).eq("id", a.tenantId)).error).not.toBeNull();
  });

  it("the shop profile offers it only with plan and switch", async () => {
    const offered = async () => ((await anon().rpc("shop_profile", { p_tenant: a.tenantId })).data?.[0]?.settings as { deal_alert?: boolean }).deal_alert;
    await db.from("tenants").update({ deal_alert_at: ago(30), shop_state: "online" }).eq("id", a.tenantId);
    expect(await offered()).toBe(false);
    await db.from("tenants").update({ plan_id: "pro" }).eq("id", a.tenantId);
    expect(await offered()).toBe(true);
  });

  it("due are only deals that went live since switching on", async () => {
    await db.from("tenants").update({ deal_alert_at: ago(-5) }).eq("id", a.tenantId);
    const make = async (key: string, extra: Record<string, unknown> = {}) => {
      const { data, error } = await db.from("deals").insert({ tenant_id: a.tenantId, slug: key, title: key, price_cents: 1000, state: "published", published_at: new Date().toISOString(), ...extra } as never).select("id").single();
      expect(error, key).toBeNull();
      deals[key] = data!.id;
    };
    await make("before");
    expect(await due()).toEqual([]);
    await db.from("tenants").update({ deal_alert_at: ago(1) }).eq("id", a.tenantId);
    await make("skip", { alert_skip: true });
    await make("later", { sales_start: ago(-60) });
    await make("over", { sales_end: ago(1), sales_start: ago(2) });
    await make("draft", { state: "draft" });
    await make("gone", { total_qty: 0 });
    expect(await due()).toEqual(["before"]);
    await db.from("tenants").update({ shop_state: "closed" }).eq("id", a.tenantId);
    expect(await due()).toEqual([]);
    await db.from("tenants").update({ shop_state: "online" }).eq("id", a.tenantId);
  });

  it("queues each deal once, for confirmed addresses of this shop only", async () => {
    await Promise.all([db.rpc("deal_alert_start"), db.rpc("deal_alert_start")]);
    await db.rpc("deal_alert_start");
    const { data: alerts } = await db.from("deal_alerts").select("id, deal_id, recipients").eq("tenant_id", a.tenantId);
    expect(alerts).toHaveLength(1);
    expect(alerts?.[0]).toMatchObject({ deal_id: deals.before, recipients: 1 });
    const { data: sends } = await db.from("deal_alert_sends").select("subscriber_id, status").eq("alert_id", alerts![0].id);
    expect(sends).toHaveLength(1);
    const [x, y] = await Promise.all([db.rpc("deal_alert_claim", { p_limit: 50 }), db.rpc("deal_alert_claim", { p_limit: 50 })]);
    const all = [...(x.data ?? []), ...(y.data ?? [])];
    // Mails of other shops on staging go straight back into the queue.
    for (const w of all.filter((w) => w.tenant_id !== a.tenantId))
      await db.from("deal_alert_sends").update({ status: "pending", attempts: 0, next_at: new Date().toISOString() }).eq("alert_id", w.alert_id).eq("subscriber_id", w.subscriber_id);
    const got = all.filter((w) => w.tenant_id === a.tenantId);
    expect(got.map((w) => w.email)).toEqual([`yes-${run}@example.com`]);
    await db.rpc("deal_alert_done", { p_alert: alerts![0].id, p_subscriber: got[0].subscriber_id, p_ok: true });
    expect((await a.client.rpc("deal_alert_history", { p_tenant: a.tenantId })).data?.[0]).toMatchObject({ title: "before", recipients: 1, sent: 1, open: 0 });
    expect(await due()).toEqual([]);
  });

  it("the wake-up token works once", async () => {
    expect((await db.rpc("deal_alert_tick_claim", { p_token: "f".repeat(48) })).data).toBe(false);
  });
});
