/**
 * Archive and delete against staging: owners/admins archive, editors cannot; an archived deal is
 * never public and cannot be published; nobody but the service role deletes a deal.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, dropTenant, makeTenant, rlsEnabled, type DB, type TestTenant } from "./helpers";

const run = `a${Date.now().toString(36)}`;
const LEGAL = "Mustertext mit genug Zeichen für die Prüfung.";

describe.skipIf(!rlsEnabled)("RLS deal archive", () => {
  let db: DB;
  let a: TestTenant;
  let live: string;
  let draft: string;
  const row = async (id: string) => (await db.from("deals").select("state, archived_at").eq("id", id).maybeSingle()).data;
  const setRole = (role: "owner" | "editor") => db.from("tenant_members").update({ role }).eq("tenant_id", a.tenantId).eq("user_id", a.userId);

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    await db.from("legal_pages").insert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: a.tenantId, kind, content: LEGAL })));
    live = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "live", title: "Live", price_cents: 100, state: "published" }).select("id").single()).data!.id;
    draft = (await db.from("deals").insert({ tenant_id: a.tenantId, slug: "draft", title: "Draft", price_cents: 100 }).select("id").single()).data!.id;
  }, 60_000);

  afterAll(async () => dropTenant(db, a));

  it("nobody but the service role deletes a deal, not even the owner", async () => {
    await a.client.from("deals").delete().eq("id", draft);
    await anon().from("deals").delete().eq("id", draft);
    expect(await row(draft)).not.toBeNull();
  });

  it("editors cannot archive", async () => {
    await setRole("editor");
    const { error } = await a.client.from("deals").update({ archived_at: new Date().toISOString() }).eq("id", draft);
    expect(error).not.toBeNull();
    expect((await row(draft))?.archived_at).toBeNull();
    await setRole("owner");
  });

  it("a published deal cannot be archived as is, an ended one can, and it stays out of the shop", async () => {
    const at = new Date().toISOString();
    expect((await a.client.from("deals").update({ archived_at: at }).eq("id", live)).error).not.toBeNull();
    expect((await anon().from("deals").select("id").eq("id", live)).data).toHaveLength(1);
    expect((await a.client.from("deals").update({ archived_at: at, state: "ended" }).eq("id", live)).error).toBeNull();
    expect((await anon().from("deals").select("id").eq("id", live)).data).toHaveLength(0);
    expect((await a.client.from("deals").update({ state: "published" }).eq("id", live)).error).not.toBeNull();
  });

  it("the owner restores from the archive", async () => {
    expect((await a.client.from("deals").update({ archived_at: null }).eq("id", live)).error).toBeNull();
    expect((await row(live))?.archived_at).toBeNull();
  });
});
