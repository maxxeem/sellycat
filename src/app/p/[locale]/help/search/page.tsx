import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { fmt, getDictionary } from "@/lib/i18n";
import { searchHelp } from "@/lib/help/queries";
import { isLocale } from "@/lib/i18n/locales";

export const metadata = { title: "Suche" };

export default function HelpSearchPage({ params, searchParams }: PageProps<"/p/[locale]/help/search">) {
  return (
    <Suspense fallback={<Skeleton className="mt-10 h-64" />}>
      <Results params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** Search results (Postgres full text, snippets with <mark>). */
async function Results({ params, searchParams }: PageProps<"/p/[locale]/help/search">) {
  const [{ locale: raw }, sp] = await Promise.all([params, searchParams]);
  const locale = isLocale(raw) ? raw : "en";
  const h = getDictionary(locale).help;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 120) : "";
  const hits = await searchHelp(q, locale);
  return (
    <div className="max-w-3xl">
      <p className="pt-6 text-sm">
        <Link href="/help" className="text-muted hover:text-ink">← {h.back}</Link>
      </p>
      <h1 className="mt-2 text-h3">{fmt(h.searchResults, { q })}</h1>
      {hits.length ? (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {hits.map((hit) => (
            <li key={hit.slug} className="px-5 py-4">
              <p className="text-xs text-muted">{h.categories[hit.category].title}</p>
              <Link href={`/help/${hit.category}/${hit.slug}`} className="font-medium hover:text-accent-text">{hit.title}</Link>
              <p className="help-snippet mt-1 text-sm text-muted" dangerouslySetInnerHTML={{ __html: hit.snippet }} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">{h.noResults}</p>
      )}
    </div>
  );
}
