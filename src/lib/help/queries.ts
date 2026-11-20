import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/lib/i18n/locales";
import { createPublicClient } from "@/lib/supabase/admin";
import { HELP_CATEGORIES, isHelpCategory, type HelpCategory } from "./categories";
import { excerpt, renderHelpMarkdown, safeSnippet, type TocEntry } from "./markdown";

/** Cache tag of everything the help center shows; staff edits refresh it. */
export const HELP_TAG = "help";

export type HelpSummary = { slug: string; category: HelpCategory; title: string; excerpt: string; fallback: boolean };
export type HelpArticle = HelpSummary & { id: string; html: string; toc: TocEntry[]; updatedAt: string | null; prev: HelpSummary | null; next: HelpSummary | null };

type Row = { id: string; slug: string; category: string; sort_order: number; help_article_versions: { locale: string; title: string; body: string; published_at: string | null }[] };

/** Live text in the wanted language, else the other one (flagged). */
function pick(row: Row, locale: Locale) {
  const own = row.help_article_versions.find((v) => v.locale === locale && v.title);
  if (own) return { ...own, fallback: false };
  const other = row.help_article_versions.find((v) => v.locale !== locale && v.title);
  return other ? { ...other, fallback: true } : null;
}

async function rows(): Promise<Row[]> {
  "use cache";
  cacheTag(HELP_TAG);
  cacheLife("hours");
  const { data } = await createPublicClient()
    .from("help_articles")
    .select("id, slug, category, sort_order, help_article_versions ( locale, title, body, published_at )")
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as Row[];
}

function summarise(row: Row, locale: Locale): HelpSummary | null {
  const v = pick(row, locale);
  if (!v || !isHelpCategory(row.category)) return null;
  return { slug: row.slug, category: row.category, title: v.title, excerpt: excerpt(v.body), fallback: v.fallback };
}

/** Published articles of a language, grouped by category in page order. */
export async function listHelp(locale: Locale): Promise<Record<HelpCategory, HelpSummary[]>> {
  const out = Object.fromEntries(HELP_CATEGORIES.map((c) => [c, [] as HelpSummary[]])) as Record<HelpCategory, HelpSummary[]>;
  for (const row of await rows()) {
    const s = summarise(row, locale);
    if (s) out[s.category].push(s);
  }
  return out;
}

/** One article with rendered text, table of contents and its neighbours in the category. */
export async function getHelpArticle(slug: string, locale: Locale): Promise<HelpArticle | null> {
  const all = await rows();
  const row = all.find((r) => r.slug === slug);
  if (!row) return null;
  const s = summarise(row, locale);
  const v = pick(row, locale);
  if (!s || !v) return null;
  const { html, toc } = renderHelpMarkdown(v.body);
  const siblings = all.filter((r) => r.category === row.category).map((r) => summarise(r, locale)).filter((x): x is HelpSummary => Boolean(x));
  const i = siblings.findIndex((x) => x.slug === slug);
  return { ...s, id: row.id, html, toc, updatedAt: v.published_at, prev: i > 0 ? siblings[i - 1] : null, next: i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : null };
}

export type HelpHit = { slug: string; category: HelpCategory; title: string; snippet: string };

/** Full-text search (Postgres); the other language fills in when this one has no hit. */
export async function searchHelp(query: string, locale: Locale): Promise<HelpHit[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  const db = createPublicClient();
  const run = async (loc: Locale) => (await db.rpc("help_search", { p_query: q, p_locale: loc, p_limit: 20 })).data ?? [];
  let hits = await run(locale);
  if (!hits.length) hits = await run(locale === "de" ? "en" : "de");
  return hits.filter((h) => isHelpCategory(h.category)).map((h) => ({ slug: h.slug, category: h.category as HelpCategory, title: h.title, snippet: safeSnippet(h.snippet) }));
}
