/**
 * Support and help center against staging: a ticket is read by its author, the shop's owners and
 * admins and staff, never by other shops, other team members or visitors; nobody writes tickets
 * directly. Published help articles are public, drafts, archived articles and feedback are not.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { admin, anon, anonKey, dropTenant, makeTenant, rlsEnabled, url, type DB, type TestTenant } from "./helpers";

const run = `s${Date.now().toString(36)}`;

describe.skipIf(!rlsEnabled)("RLS support and help", () => {
  let db: DB;
  let a: TestTenant;
  let b: TestTenant;
  let redeemer: DB;
  let redeemerId: string;
  let ownerTicket: string;
  let redeemerTicket: string;
  let draftArticle: string;
  let archivedArticle: string;

  beforeAll(async () => {
    db = admin();
    a = await makeTenant(db, run);
    b = await makeTenant(db, `${run}b`);
    const email = `red-${run}@example.com`;
    const password = `Red-${run}-pw!`;
    redeemerId = (await db.auth.admin.createUser({ email, password, email_confirm: true })).data.user!.id;
    await db.from("tenant_members").insert({ tenant_id: a.tenantId, user_id: redeemerId, role: "redeemer" });
    redeemer = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    await redeemer.auth.signInWithPassword({ email, password });

    const ticket = async (userId: string, mail: string) => {
      const id = (await db.from("support_tickets").insert({ tenant_id: a.tenantId, user_id: userId, user_email: mail, subject: "Hilfe", category: "question" }).select("id").single()).data!.id;
      await db.from("support_messages").insert({ ticket_id: id, tenant_id: a.tenantId, author: "customer", author_user_id: userId, body: "Frage" });
      return id;
    };
    ownerTicket = await ticket(a.userId, `rls-${run}@example.com`);
    redeemerTicket = await ticket(redeemerId, email);

    const article = async (slug: string, status: "published" | "archived") => {
      const id = (await db.from("help_articles").insert({ slug, category: "technical", status }).select("id").single()).data!.id;
      await db.from("help_article_versions").insert({ article_id: id, locale: "de", title: `Titel ${slug}`, body: `Zebraschnecke ${run}`, draft_title: "Geheim", draft_body: "Entwurf", published_at: new Date().toISOString() });
      return id;
    };
    draftArticle = await article(`rls-${run}`, "published");
    archivedArticle = await article(`rls-${run}-old`, "archived");
    await db.from("help_feedback").insert({ article_id: draftArticle, locale: "de", helpful: false, comment: "fehlt", session: run });
  }, 60_000);

  afterAll(async () => {
    await db.from("support_tickets").delete().in("id", [ownerTicket, redeemerTicket]);
    await db.from("help_articles").delete().in("id", [draftArticle, archivedArticle]);
    await dropTenant(db, a);
    await dropTenant(db, b);
    await db.auth.admin.deleteUser(redeemerId);
  });

  const ids = async (client: DB) => ((await client.from("support_tickets").select("id").in("id", [ownerTicket, redeemerTicket])).data ?? []).map((r) => r.id).sort();

  it("owners see all tickets of their shop, members only their own", async () => {
    expect(await ids(a.client)).toEqual([ownerTicket, redeemerTicket].sort());
    expect(await ids(redeemer)).toEqual([redeemerTicket]);
    expect(((await redeemer.from("support_messages").select("id").eq("ticket_id", ownerTicket)).data ?? []).length).toBe(0);
    expect(((await redeemer.from("support_messages").select("id").eq("ticket_id", redeemerTicket)).data ?? []).length).toBe(1);
  });

  it("other shops and visitors see nothing", async () => {
    expect(await ids(b.client)).toEqual([]);
    expect(await ids(anon())).toEqual([]);
    expect(((await b.client.from("support_messages").select("id").eq("ticket_id", ownerTicket)).data ?? []).length).toBe(0);
  });

  it("nobody writes tickets or messages directly", async () => {
    expect((await a.client.from("support_tickets").insert({ tenant_id: a.tenantId, user_id: a.userId, user_email: "x@example.com", subject: "x", category: "other" })).error).not.toBeNull();
    expect((await a.client.from("support_messages").insert({ ticket_id: ownerTicket, author: "staff", body: "fake" })).error).not.toBeNull();
    expect((await a.client.from("support_tickets").update({ status: "done" }).eq("id", ownerTicket).select("id")).data ?? []).toHaveLength(0);
  });

  it("published articles are public, without drafts", async () => {
    const { data } = await anon().from("help_article_versions").select("title, body").eq("article_id", draftArticle);
    expect(data?.[0]?.title).toBe(`Titel rls-${run}`);
    expect((await anon().from("help_article_versions").select("draft_title").eq("article_id", draftArticle)).error).not.toBeNull();
    expect((await a.client.from("help_article_versions").select("draft_body").eq("article_id", draftArticle)).error).not.toBeNull();
  });

  it("archived articles, history and feedback stay hidden", async () => {
    expect((await anon().from("help_articles").select("id").eq("id", archivedArticle)).data ?? []).toHaveLength(0);
    expect((await anon().from("help_article_versions").select("title").eq("article_id", archivedArticle)).data ?? []).toHaveLength(0);
    expect((await a.client.from("help_feedback").select("id").eq("article_id", draftArticle)).data ?? []).toHaveLength(0);
    expect((await anon().from("help_articles").insert({ slug: `x-${run}`, category: "deals" })).error).not.toBeNull();
  });

  it("search finds published texts only", async () => {
    const { data } = await anon().rpc("help_search", { p_query: "Zebraschnecke", p_locale: "de" });
    const slugs = (data ?? []).map((h) => h.slug);
    expect(slugs).toContain(`rls-${run}`);
    expect(slugs).not.toContain(`rls-${run}-old`);
  });
});
