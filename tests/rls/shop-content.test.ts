/**
 * Phase 2 isolation: partners, deals, images, themes, legal pages and the media bucket against
 * the real staging database. Skipped without credentials.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `c${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS shop content", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let bPartner: string;
  let bDraft: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, `${run}-a`);
    b = await makeTenant(db, `${run}-b`);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: b.tenantId, kind, content: LEGAL })));
    bPartner = (await db.from("partners").insert({ tenant_id: b.tenantId, name: "B Partner" }).select("id").single()).data!.id;
    bDraft = (await db.from("deals").insert({ tenant_id: b.tenantId, slug: "draft", title: "B draft", price_cents: 100 }).select("id").single()).data!.id;
    await db.from("deals").insert({ tenant_id: b.tenantId, slug: "live", title: "B live", price_cents: 100, state: "published", partner_id: bPartner });
  });

  afterAll(async () => {
    await dropTenant(db, a);
    await dropTenant(db, b);
  });

  it("an owner sees only what another tenant's shop shows publicly", async () => {
    const hidden = (await db.from("partners").insert({ tenant_id: b.tenantId, name: "B internal" }).select("id").single()).data!.id;
    const { data: partners } = await a.client.from("partners").select("name").eq("tenant_id", b.tenantId);
    expect(partners?.map((p) => p.name)).toEqual(["B Partner"]);
    expect((await a.client.from("partners").select("id").eq("id", hidden)).data).toEqual([]);
    expect((await a.client.from("deals").select("id").eq("id", bDraft)).data).toEqual([]);
  });

  it("the FAQ library belongs to the shop's team", async () => {
    const row = { tenant_id: a.tenantId, question: "Wie?", answer: "So." };
    expect((await a.client.from("faq_library").insert(row)).error).toBeNull();
    expect((await b.client.from("faq_library").insert(row)).error).not.toBeNull();
    expect((await b.client.from("faq_library").select("id")).data).toEqual([]);
    expect((await anon().from("faq_library").select("id")).error).not.toBeNull();
    expect((await a.client.from("faq_library").select("question")).data).toEqual([{ question: "Wie?" }]);
    expect((await anon().from("deals").select("ad_image").limit(1)).error).not.toBeNull();
  });

  it("anon sees published deals of a live shop, never drafts", async () => {
    const { data } = await anon().from("deals").select("slug").eq("tenant_id", b.tenantId);
    expect(data?.map((d) => d.slug)).toEqual(["live"]);
    const { data: partners } = await anon().from("partners").select("name").eq("tenant_id", b.tenantId);
    expect(partners?.map((p) => p.name)).toEqual(["B Partner"]);
  });

  it("anon sees nothing of a suspended shop", async () => {
    await db.from("tenants").update({ status: "suspended" }).eq("id", b.tenantId);
    expect((await anon().from("deals").select("id").eq("tenant_id", b.tenantId)).data).toEqual([]);
    await db.from("tenants").update({ status: "active" }).eq("id", b.tenantId);
  });

  it("an owner cannot write into another tenant", async () => {
    const insert = await a.client.from("deals").insert({ tenant_id: b.tenantId, slug: "x", title: "x", price_cents: 1 });
    expect(insert.error).not.toBeNull();
    await a.client.from("deals").update({ title: "hacked" }).eq("id", bDraft);
    expect((await db.from("deals").select("title").eq("id", bDraft).single()).data?.title).toBe("B draft");
  });

  it("a deal cannot point at another tenant's partner", async () => {
    const { error } = await a.client.from("deals").insert({ tenant_id: a.tenantId, slug: "cross", title: "x", price_cents: 1, partner_id: bPartner });
    expect(error?.message).toContain("partner of another tenant");
  });

  it("editors cannot touch sold/reserved counters", async () => {
    const { data: deal } = await a.client.from("deals").insert({ tenant_id: a.tenantId, slug: "counters", title: "x", price_cents: 1, sold_qty: 99 } as never).select("id, sold_qty").single();
    expect(deal?.sold_qty).toBe(0);
    const upd = await a.client.from("deals").update({ sold_qty: 5 } as never).eq("id", deal!.id);
    expect(upd.error).not.toBeNull();
  });

  it("publishing requires imprint, terms and privacy", async () => {
    const { data: deal } = await a.client.from("deals").insert({ tenant_id: a.tenantId, slug: "nolegal", title: "x", price_cents: 1 }).select("id").single();
    const { error } = await a.client.from("deals").update({ state: "published" }).eq("id", deal!.id);
    expect(error?.message).toContain("legal pages missing");
  });

  it("themes: anon cannot read drafts, owners cannot write other tenants' themes", async () => {
    await db.from("shop_themes").upsert({ tenant_id: b.tenantId, draft: { secret: true }, published: {} } as never, { onConflict: "tenant_id" });
    expect((await anon().from("shop_themes").select("draft").eq("tenant_id", b.tenantId)).data).toEqual([]);
    const w = await a.client.from("shop_themes").upsert({ tenant_id: b.tenantId, draft: {}, published: { hacked: true } } as never, { onConflict: "tenant_id" });
    expect(w.error).not.toBeNull();
  });

  it("media bucket: uploads only into the own tenant folder", async () => {
    const file = new Blob(["x"], { type: "image/png" });
    const own = await a.client.storage.from("shop-media").upload(`${a.tenantId}/test/${run}.png`, file);
    expect(own.error).toBeNull();
    const foreign = await a.client.storage.from("shop-media").upload(`${b.tenantId}/test/${run}.png`, file);
    expect(foreign.error).not.toBeNull();
    await db.storage.from("shop-media").remove([`${a.tenantId}/test/${run}.png`]);
  });
});
