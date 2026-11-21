import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { buttonClass } from "@/components/ui";
import { turnstileSiteKey } from "@/lib/access/server";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/locales";
import { ContactForm } from "./contact-form";

export async function generateMetadata({ params }: PageProps<"/p/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : "en").contact.metaTitle, alternates: { canonical: "/contact" } };
}

/** Contact page (sellycat.com/contact): one form, mailed to the team; no address on the page. */
export default async function ContactPage({ params }: PageProps<"/p/[locale]/contact">) {
  const { locale: raw } = await params;
  const t = getDictionary(isLocale(raw) ? raw : "en");
  return (
    <main className="flex min-h-dvh flex-col bg-surface-2">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Sellycat">
          <Logo width={160} />
        </Link>
        <Link href="/login" className={buttonClass.secondary}>
          {t.common.login}
        </Link>
      </header>
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-8 sm:px-8">
        <h1 className="text-h2 text-balance">{t.contact.title}</h1>
        <p className="mt-3 text-muted">{t.contact.intro}</p>
        <div className="mt-8">
          <ContactForm turnstileKey={turnstileSiteKey()} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
