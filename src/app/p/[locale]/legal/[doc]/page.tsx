import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { fmt, getDictionary } from "@/lib/i18n";
import { LOCALES, isLocale } from "@/lib/i18n/locales";
import { renderHelpMarkdown } from "@/lib/help/markdown";
import { LEGAL_DOCS, LEGAL_VERSION, isLegalDoc, legalDoc } from "@/lib/legal/docs";

/** Sellycat's legal texts (imprint, terms, privacy, data processing), static per language. */
export function generateStaticParams() {
  return LOCALES.flatMap((locale) => LEGAL_DOCS.map((doc) => ({ locale, doc })));
}

export async function generateMetadata({ params }: PageProps<"/p/[locale]/legal/[doc]">): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isLegalDoc(doc)) return {};
  return { title: legalDoc(locale, doc).title };
}

export default async function LegalPage({ params }: PageProps<"/p/[locale]/legal/[doc]">) {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isLegalDoc(doc)) notFound();
  const t = getDictionary(locale);
  const { title, body } = legalDoc(locale, doc);
  const { html, toc } = renderHelpMarkdown(body);
  const date = new Date(`${LEGAL_VERSION}T12:00:00Z`).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const label: Record<string, string> = { imprint: t.legal.imprint, terms: t.legal.terms, privacy: t.legal.privacy, dpa: t.legal.dpa };
  return (
    <main className="flex min-h-dvh flex-col bg-surface-2">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Sellycat">
          <Logo width={130} />
        </Link>
        <LanguageSwitcher />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pb-20 pt-6 sm:px-8 lg:grid-cols-[1fr_16rem]">
        <article>
          <h1 className="text-h2">{title}</h1>
          <p className="mt-2 text-sm text-muted">{fmt(t.legal.updated, { date })}</p>
          <div className="help-prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
        <aside className="flex flex-col gap-6 text-sm lg:sticky lg:top-6 lg:self-start">
          {toc.filter((e) => e.level === 2).length > 2 ? (
            <nav aria-label={title} className="hidden lg:block">
              <ul className="flex flex-col gap-1.5">
                {toc
                  .filter((e) => e.level === 2)
                  .map((e) => (
                    <li key={e.id}>
                      <a href={`#${e.id}`} className="text-muted hover:text-ink">
                        {e.text}
                      </a>
                    </li>
                  ))}
              </ul>
            </nav>
          ) : null}
          <nav aria-label={t.legal.otherDocs}>
            <p className="mb-2 font-semibold">{t.legal.otherDocs}</p>
            <ul className="flex flex-col gap-1.5">
              {LEGAL_DOCS.filter((d) => d !== doc).map((d) => (
                <li key={d}>
                  <Link href={`/legal/${d}`} className="text-muted hover:text-ink">
                    {label[d]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
      <SiteFooter language={false} />
      <div className="h-2 bg-coral" aria-hidden />
    </main>
  );
}
