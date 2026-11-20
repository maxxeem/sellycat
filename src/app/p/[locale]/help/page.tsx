import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { fmt, getDictionary } from "@/lib/i18n";
import { HELP_CATEGORIES } from "@/lib/help/categories";
import { HELP_TAG, listHelp } from "@/lib/help/queries";
import { fromParams } from "@/lib/i18n/params";
import type { Locale } from "@/lib/i18n/locales";

/** Help-center start: the categories with their first articles. */
export default async function HelpHome({ params }: PageProps<"/p/[locale]/help">) {
  const { locale } = await fromParams(params);
  return <CachedHome locale={locale} />;
}

async function CachedHome({ locale }: { locale: Locale }) {
  "use cache";
  cacheTag(HELP_TAG);
  cacheLife("hours");
  const h = getDictionary(locale).help;
  const groups = await listHelp(locale);
  return (
    <>
      <div className="py-8 sm:py-12">
        <h1 className="text-h2 text-balance">{h.heading}</h1>
        <p className="mt-2 max-w-xl text-muted">{h.intro}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_CATEGORIES.map((key) => {
          const c = h.categories[key];
          const articles = groups[key];
          return (
            <li key={key} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
              <Link href={`/help/${key}`} className="text-lg font-semibold hover:text-accent-text">
                {c.title}
              </Link>
              <p className="mt-1 text-sm text-muted">{c.text}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                {articles.slice(0, 4).map((a) => (
                  <li key={a.slug}>
                    <Link href={`/help/${key}/${a.slug}`} className="text-sm underline-offset-2 hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={`/help/${key}`} className="mt-4 text-xs font-medium text-muted hover:text-ink">
                {fmt(h.articles, { count: articles.length })} →
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
