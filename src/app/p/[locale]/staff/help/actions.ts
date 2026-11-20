"use server";

import { revalidatePath, updateTag } from "next/cache";
import { HELP_SLUG, isHelpCategory } from "@/lib/help/categories";
import { HELP_TAG } from "@/lib/help/queries";
import { audit, requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export type HelpResult = { ok: true; id?: string; url?: string } | { ok: false; error: "invalid" | "slugTaken" | "failed" };

const isLocale = (l: string): l is "de" | "en" => l === "de" || l === "en";
const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);
const done = (): HelpResult => {
  updateTag(HELP_TAG);
  revalidatePath("/p/[locale]/staff/help", "page");
  return { ok: true };
};

export async function createArticle(input: { slug: string; category: string; title: string }): Promise<HelpResult> {
  const staff = await requireStaff();
  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim().slice(0, 200);
  if (!HELP_SLUG.test(slug) || !isHelpCategory(input.category) || !title) return { ok: false, error: "invalid" };
  const db = createAdminClient();
  const { data: last } = await db.from("help_articles").select("sort_order").eq("category", input.category).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("help_articles").insert({ slug, category: input.category, sort_order: (last?.sort_order ?? 0) + 10 }).select("id").single();
  if (error || !data) return { ok: false, error: error?.code === "23505" ? "slugTaken" : "failed" };
  // Both languages exist from the start; the German title goes into the draft (nothing is live yet).
  await db.from("help_article_versions").insert([
    { article_id: data.id, locale: "de", draft_title: title, draft_body: "", draft_updated_at: new Date().toISOString(), updated_by: staff.id },
    { article_id: data.id, locale: "en", updated_by: staff.id },
  ]);
  await audit(staff.id, "help.create", { type: "help_article", id: data.id, meta: { slug } });
  done();
  return { ok: true, id: data.id };
}

export async function updateMeta(id: string, patch: { slug?: string; category?: string; status?: string }): Promise<HelpResult> {
  const staff = await requireStaff();
  if (!isId(id)) return { ok: false, error: "invalid" };
  const row: { slug?: string; category?: string; status?: string } = {};
  if (patch.slug !== undefined) {
    if (!HELP_SLUG.test(patch.slug)) return { ok: false, error: "invalid" };
    row.slug = patch.slug;
  }
  if (patch.category !== undefined) {
    if (!isHelpCategory(patch.category)) return { ok: false, error: "invalid" };
    row.category = patch.category;
  }
  if (patch.status !== undefined) row.status = patch.status === "archived" ? "archived" : "published";
  const { error } = await createAdminClient().from("help_articles").update(row).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "slugTaken" : "failed" };
  await audit(staff.id, "help.meta", { type: "help_article", id, meta: row });
  return done();
}

/** One step up or down within the category. */
export async function move(id: string, dir: -1 | 1): Promise<HelpResult> {
  await requireStaff();
  const db = createAdminClient();
  const { data: me } = await db.from("help_articles").select("id, category").eq("id", id).maybeSingle();
  if (!me) return { ok: false, error: "invalid" };
  const { data: list } = await db.from("help_articles").select("id").eq("category", me.category).order("sort_order").order("created_at");
  const ids = (list ?? []).map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((rid, k) => db.from("help_articles").update({ sort_order: (k + 1) * 10 }).eq("id", rid)));
  return done();
}

export async function saveDraft(id: string, locale: string, title: string, body: string): Promise<HelpResult> {
  const staff = await requireStaff();
  if (!isId(id) || !isLocale(locale)) return { ok: false, error: "invalid" };
  const { error } = await createAdminClient()
    .from("help_article_versions")
    .upsert({ article_id: id, locale, draft_title: title.trim().slice(0, 200), draft_body: body.slice(0, 60_000), draft_updated_at: new Date().toISOString(), updated_by: staff.id }, { onConflict: "article_id,locale" });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/p/[locale]/staff/help", "page");
  return { ok: true };
}

/** Draft → live for one language; the previous live text goes into the history (last 10 kept). */
export async function publish(id: string, locale: string): Promise<HelpResult> {
  const staff = await requireStaff();
  if (!isId(id) || !isLocale(locale)) return { ok: false, error: "invalid" };
  const db = createAdminClient();
  const { data: v } = await db.from("help_article_versions").select("title, body, draft_title, draft_body").eq("article_id", id).eq("locale", locale).maybeSingle();
  if (!v || v.draft_title == null || !v.draft_title.trim()) return { ok: false, error: "invalid" };
  if (v.title) await db.from("help_article_history").insert({ article_id: id, locale, title: v.title, body: v.body, created_by: staff.id });
  const { error } = await db
    .from("help_article_versions")
    .update({ title: v.draft_title.trim(), body: v.draft_body ?? "", draft_title: null, draft_body: null, draft_updated_at: null, published_at: new Date().toISOString(), updated_by: staff.id })
    .eq("article_id", id)
    .eq("locale", locale);
  if (error) return { ok: false, error: "failed" };
  const { data: old } = await db.from("help_article_history").select("id").eq("article_id", id).eq("locale", locale).order("created_at", { ascending: false }).range(10, 100);
  if (old?.length) await db.from("help_article_history").delete().in("id", old.map((o) => o.id));
  await audit(staff.id, "help.publish", { type: "help_article", id, meta: { locale } });
  return done();
}

export async function discardDraft(id: string, locale: string): Promise<HelpResult> {
  await requireStaff();
  if (!isId(id) || !isLocale(locale)) return { ok: false, error: "invalid" };
  await createAdminClient().from("help_article_versions").update({ draft_title: null, draft_body: null, draft_updated_at: null }).eq("article_id", id).eq("locale", locale);
  revalidatePath("/p/[locale]/staff/help", "page");
  return { ok: true };
}

/** An earlier version goes into the draft (never straight live). */
export async function restoreVersion(historyId: string): Promise<HelpResult> {
  const staff = await requireStaff();
  const db = createAdminClient();
  const { data: h } = await db.from("help_article_history").select("article_id, locale, title, body").eq("id", historyId).maybeSingle();
  if (!h || !isLocale(h.locale)) return { ok: false, error: "invalid" };
  return saveDraft(h.article_id, h.locale, h.title, h.body).then(async (r) => {
    if (r.ok) await audit(staff.id, "help.restore", { type: "help_article", id: h.article_id, meta: { locale: h.locale } });
    return r;
  });
}

export async function deleteArticle(id: string): Promise<HelpResult> {
  const staff = await requireStaff({ role: "superadmin" });
  if (!isId(id)) return { ok: false, error: "invalid" };
  const { error } = await createAdminClient().from("help_articles").delete().eq("id", id);
  if (error) return { ok: false, error: "failed" };
  await audit(staff.id, "help.delete", { type: "help_article", id });
  return done();
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

/** Image for an article: public bucket «help», returns the URL for the Markdown. */
export async function uploadImage(form: FormData): Promise<HelpResult> {
  await requireStaff();
  const file = form.get("file");
  if (!(file instanceof File) || !IMAGE_TYPES[file.type] || file.size > 10 * 1024 * 1024) return { ok: false, error: "invalid" };
  const path = `articles/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const db = createAdminClient();
  const { error } = await db.storage.from("help").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "failed" };
  return { ok: true, url: db.storage.from("help").getPublicUrl(path).data.publicUrl };
}
