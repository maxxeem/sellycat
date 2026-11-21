"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/context";
import { Logo } from "./brand";

/**
 * Footer of Sellycat's own pages (landing, pricing, help, legal, sign-in). Theme tokens only, so it
 * fits light pages and the dark app theme alike.
 * - full (default): brand column with the logo, link columns (product incl. contact form, legal), bottom
 *   bar with copyright and language. On phones everything stacks, one link per line.
 * - compact (sign-in pages): one quiet row with the legal links, copyright and language.
 * `language={false}` hides the switcher where the page header already has one.
 */
export function SiteFooter({ language = true, compact = false }: { language?: boolean; compact?: boolean }) {
  const { t } = useI18n();
  const l = t.legal;
  // The year after the prerender (2026 until then); the page itself stays static.
  const [year, setYear] = useState(2026);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock may only be read in the browser
  useEffect(() => setYear(new Date().getFullYear()), []);

  const product: Array<[string, string]> = [
    ["/pricing", l.pricing],
    ["/help", l.help],
    ["/contact", t.contact.nav],
    ["/login", t.common.login],
  ];
  const legal: Array<[string, string]> = [
    ["/legal/imprint", l.imprint],
    ["/legal/terms", l.terms],
    ["/legal/privacy", l.privacy],
    ["/legal/dpa", l.dpa],
  ];
  const switcher = language ? (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted" aria-hidden />
      <LanguageSwitcher />
    </div>
  ) : null;
  const copyright = (
    <p>
      © {year} {l.company}
    </p>
  );

  if (compact)
    return (
      <footer className="border-t border-line text-xs text-muted" data-testid="site-footer">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <nav aria-label={l.otherDocs}>
            <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {[...legal, ["/help", l.help] as [string, string]].map(([href, text]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-ink">
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center justify-between gap-5 sm:justify-end">
            {copyright}
            {switcher}
          </div>
        </div>
      </footer>
    );

  const column = (title: string, items: Array<[string, string]>) => (
    <nav aria-label={title} className="flex flex-col gap-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink">{title}</p>
      <ul className="flex flex-col gap-3">
        {items.map(([href, text]) => (
          <li key={href}>
            <Link href={href} className="transition hover:text-ink">
              {text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <footer className="border-t border-line bg-surface-2 text-sm text-muted" data-testid="site-footer">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="flex max-w-xs flex-col gap-4">
          <Link href="/" aria-label="Sellycat" className="self-start">
            <Logo width={160} />
          </Link>
        </div>
        {column(l.product, product)}
        {column(l.legalTitle, legal)}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {copyright}
          {switcher}
        </div>
      </div>
    </footer>
  );
}
