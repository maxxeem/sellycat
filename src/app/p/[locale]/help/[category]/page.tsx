import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { HELP_CATEGORIES, isHelpCategory } from "@/lib/help/categories";
import { HELP_TAG, listHelp } from "@/lib/help/queries";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export function generateStaticParams() {
  return HELP_CATEGORIES.map((category) => ({ category }));
}

/** One category: its articles in order, each with a teaser. */
export default async function HelpCategoryPage({ params }: PageProps<"/p/[locale]/help/[category]">) {
  const { locale, category } = await params;
  if (!isHelpCategory(category)) notFound();
  return <CachedCategory locale={isLocale(locale) ? locale : "en"} category={category} />;
}

async function CachedCategory({ locale, category }: { locale: Locale; category: (typeof HELP_CATEGORIES)[number] }) {
  "use cache";
  cacheTag(HELP_TAG);
  cacheLife("hours");
  const h = getDictionary(locale).help;
  const articles = (await listHelp(locale))[category];
  const c = h.categories[category];
  return (
    <div className="max-w-3xl">
      <title>{`${c.title} · Sellycat Hilfe`}</title>
      <p className="pt-6 text-sm">
        <Link href="/help" className="text-muted hover:text-ink">← {h.back}</Link>
      </p>
      <h1 className="mt-2 text-h2">{c.title}</h1>
      <p className="mt-2 text-muted">{c.text}</p>
      <ol className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
        {articles.map((a, i) => (
          <li key={a.slug}>
            <Link href={`/help/${category}/${a.slug}`} className="flex items-start gap-4 px-5 py-4 hover:bg-surface-2">
              <span className="mt-0.5 w-6 shrink-0 text-right text-sm tabular-nums text-muted">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-medium">
                  {a.title}
                  {a.fallback ? <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">{locale === "de" ? "EN" : "DE"}</span> : null}
                </span>
                {a.excerpt ? <span className="mt-0.5 block text-sm text-muted">{a.excerpt}</span> : null}
              </span>
            </Link>
          </li>
        ))}
        {!articles.length ? <li className="px-5 py-6 text-sm text-muted">{h.noResults}</li> : null}
      </ol>
    </div>
  );
}
