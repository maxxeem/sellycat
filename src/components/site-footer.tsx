"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

/** Footer of Sellycat's own pages (start, pricing, help, sign-in): legal links and operator. */
export function SiteFooter() {
  const l = useI18n().t.legal;
  const links: Array<[string, string]> = [
    ["/pricing", l.pricing],
    ["/help", l.help],
    ["/legal/imprint", l.imprint],
    ["/legal/terms", l.terms],
    ["/legal/privacy", l.privacy],
    ["/legal/dpa", l.dpa],
  ];
  return (
    <footer className="border-t border-line text-sm text-muted">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <p>© {l.company}</p>
      </div>
    </footer>
  );
}
