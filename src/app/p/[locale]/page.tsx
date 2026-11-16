import Link from "next/link";
import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonClass } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/locales";

/**
 * Placeholder start page. The real landing page comes later: it will live in this route and can
 * use its own components under src/components/marketing without touching the app.
 */
export default async function HomePage({ params }: PageProps<"/p/[locale]">) {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  return (
    <main className="flex min-h-dvh flex-col bg-surface-2">
      <header className="flex items-center justify-end gap-3 px-4 py-4 sm:px-8">
        <LanguageSwitcher />
        <Link href="/login" className={buttonClass.secondary}>
          {t.common.login}
        </Link>
      </header>
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 pb-24 text-center">
        <Logo width={280} priority />
        <h1 className="text-h2 text-balance">{t.home.tagline}</h1>
        <p className="text-muted">{t.home.soon}</p>
        <Link href="/login" className={buttonClass.primary}>
          {t.common.login}
        </Link>
      </section>
      <div className="h-2 bg-coral" aria-hidden />
    </main>
  );
}
