import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { buttonClass } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: { default: "Hilfe-Center", template: "%s · Sellycat Hilfe" } };

/** Public help center frame: logo, search (plain GET form, works without JavaScript), support, language. */
export default async function HelpLayout({ children, params }: LayoutProps<"/p/[locale]/help">) {
  const { t } = await fromParams(params);
  const h = t.help;
  return (
    <main className="flex min-h-dvh flex-col bg-surface-2">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Sellycat">
          <Logo width={130} />
        </Link>
        <Link href="/help" className="text-sm font-semibold text-muted hover:text-ink">
          {h.title}
        </Link>
        <form action="/help/search" method="get" role="search" className="order-last w-full sm:order-none sm:ml-auto sm:max-w-sm sm:flex-1">
          <input
            type="search"
            name="q"
            required
            maxLength={120}
            placeholder={h.searchPlaceholder}
            aria-label={h.search}
            className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Link href="/dashboard/support" className={buttonClass.primary}>
            {h.contact}
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 sm:px-8">{children}</div>
      <SiteFooter />
      <div className="h-2 bg-coral" aria-hidden />
    </main>
  );
}
