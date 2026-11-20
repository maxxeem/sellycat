import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HelpFeedback } from "@/components/help/feedback";
import { Skeleton, buttonClass } from "@/components/ui";
import { fmt, getDictionary } from "@/lib/i18n";
import { isHelpCategory } from "@/lib/help/categories";
import { HELP_TAG, getHelpArticle } from "@/lib/help/queries";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export function generateStaticParams() {
  return [{ category: "getting-started", slug: "placeholder" }];
}

export default function HelpArticlePage({ params }: PageProps<"/p/[locale]/help/[category]/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="mt-10 h-96" />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: { params: PageProps<"/p/[locale]/help/[category]/[slug]">["params"] }) {
  const { locale, category, slug } = await params;
  return <CachedArticle locale={isLocale(locale) ? locale : "en"} category={category} slug={slug} />;
}

/** One article: table of contents, text, neighbours in the category, feedback. */
async function CachedArticle({ locale, category, slug }: { locale: Locale; category: string; slug: string }) {
  "use cache";
  cacheTag(HELP_TAG);
  cacheLife("hours");
  if (!isHelpCategory(category)) notFound();
  const a = await getHelpArticle(slug, locale);
  if (!a || a.category !== category) notFound();
  const h = getDictionary(locale).help;
  const c = h.categories[category];
  const toc = a.toc.filter((e) => e.level === 2);
  return (
    <article className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-12">
      <title>{`${a.title} · Sellycat Hilfe`}</title>
      {a.excerpt ? <meta name="description" content={a.excerpt} /> : null}
      <div className="min-w-0">
        <p className="pt-6 text-sm text-muted">
          <Link href="/help" className="hover:text-ink">{h.back}</Link> · <Link href={`/help/${category}`} className="hover:text-ink">{c.title}</Link>
        </p>
        <h1 className="mt-2 text-h2 text-balance">{a.title}</h1>
        {a.updatedAt ? (
          <p className="mt-2 text-xs text-muted">
            {fmt(h.updated, { date: new Date(a.updatedAt).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" }) })}
          </p>
        ) : null}
        {a.fallback ? <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-muted">{h.fallback}</p> : null}
        {toc.length > 1 ? (
          <nav className="mt-6 rounded-2xl border border-line bg-surface p-4 lg:hidden" aria-label={h.onThisPage}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{h.onThisPage}</p>
            <ol className="mt-2 flex flex-col gap-1 text-sm">
              {toc.map((e) => (
                <li key={e.id}>
                  <a href={`#${e.id}`} className="hover:underline">{e.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="help-prose mt-6" dangerouslySetInnerHTML={{ __html: a.html }} />
        <div className="mt-10 border-t border-line pt-6">
          <HelpFeedback articleId={a.id} locale={locale} texts={{ question: h.helpful, yes: h.yes, no: h.no, prompt: h.feedbackPrompt, send: h.feedbackSend, thanks: h.feedbackThanks }} />
        </div>
        <nav className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          {a.prev ? (
            <Link href={`/help/${category}/${a.prev.slug}`} className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm hover:border-accent">
              <span className="block text-xs text-muted">← {h.prev}</span>
              {a.prev.title}
            </Link>
          ) : <span />}
          {a.next ? (
            <Link href={`/help/${category}/${a.next.slug}`} className="rounded-2xl border border-line bg-surface px-4 py-3 text-right text-sm hover:border-accent">
              <span className="block text-xs text-muted">{h.next} →</span>
              {a.next.title}
            </Link>
          ) : <span />}
        </nav>
        <div className="mt-10 rounded-2xl border border-line bg-surface p-5 text-sm">
          <p className="font-semibold">{h.stillStuck}</p>
          <Link href="/dashboard/support" className={`${buttonClass.secondary} mt-3`}>{h.contact}</Link>
        </div>
      </div>
      <aside className="hidden lg:block">
        {toc.length > 1 ? (
          <nav className="sticky top-6 pt-16" aria-label={h.onThisPage}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{h.onThisPage}</p>
            <ol className="mt-3 flex flex-col gap-1.5 border-l border-line text-sm">
              {toc.map((e) => (
                <li key={e.id} className="pl-4">
                  <a href={`#${e.id}`} className="text-muted hover:text-ink">{e.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
      </aside>
    </article>
  );
}
