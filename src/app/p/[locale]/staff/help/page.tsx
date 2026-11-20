import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { HelpStudio, type StudioArticle } from "./studio";

export const metadata = { title: "Hilfe-Artikel" };

export default async function StaffHelpPage({ params, searchParams }: PageProps<"/p/[locale]/staff/help">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.help.title} description={t.staff.help.intro} />
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Studio searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Studio({ searchParams }: { searchParams: PageProps<"/p/[locale]/staff/help">["searchParams"] }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const db = createAdminClient();
  const [{ data: articles }, { data: feedback }] = await Promise.all([
    db.from("help_articles").select("id, slug, category, sort_order, status, help_article_versions ( locale, title, body, draft_title, draft_body, draft_updated_at, published_at )").order("sort_order").order("created_at"),
    db.from("help_feedback").select("article_id, helpful, comment, locale, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  const list = (articles ?? []) as StudioArticle[];
  const selected = typeof sp.a === "string" && list.some((a) => a.id === sp.a) ? sp.a : (list[0]?.id ?? null);
  const { data: history } = selected
    ? await db.from("help_article_history").select("id, locale, title, created_at").eq("article_id", selected).order("created_at", { ascending: false })
    : { data: [] };
  const votes: Record<string, { yes: number; no: number }> = {};
  for (const f of feedback ?? []) {
    const v = (votes[f.article_id] ??= { yes: 0, no: 0 });
    if (f.helpful) v.yes++;
    else v.no++;
  }
  const comments = (feedback ?? []).filter((f) => f.article_id === selected && f.comment).slice(0, 20).map((f) => ({ comment: f.comment!, locale: f.locale, at: f.created_at }));
  return <HelpStudio articles={list} selected={selected} history={history ?? []} votes={votes} comments={comments} canDelete={staff.role === "superadmin"} />;
}
