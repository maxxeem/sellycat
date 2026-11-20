"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/context";

/**
 * Footer of Sellycat's own pages (landing, pricing, help, legal, sign-in): product and legal links,
 * language and operator. Theme tokens only, so it fits light pages and the dark landing alike. On
 * phones the links stack (one per line), from sm they sit in a row.
 */
export function SiteFooter({ language = true }: { language?: boolean }) {
  const { t } = useI18n();
  const l = t.legal;
  const product: Array<[string, string]> = [
    ["/pricing", l.pricing],
    ["/help", l.help],
    ["/login", t.common.login],
  ];
  const legal: Array<[string, string]> = [
    ["/legal/imprint", l.imprint],
    ["/legal/terms", l.terms],
    ["/legal/privacy", l.privacy],
    ["/legal/dpa", l.dpa],
  ];
  // The year after the prerender (2026 until then); the page itself stays static.
  const [year, setYear] = useState(2026);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock may only be read in the browser
  useEffect(() => setYear(new Date().getFullYear()), []);
  const list = (items: Array<[string, string]>, label: string) => (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
        {items.map(([href, text]) => (
          <li key={href}>
            <Link href={href} className="hover:text-ink hover:underline">
              {text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
  return (
    <footer className="border-t border-line text-sm text-muted" data-testid="site-footer">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:gap-2">
            {list(product, "Sellycat")}
            {list(legal, t.site.footer.legal)}
          </div>
          {language ? (
            <div className="self-start">
              <LanguageSwitcher />
            </div>
          ) : null}
        </div>
        <p>
          © {year} {l.company}
        </p>
      </div>
    </footer>
  );
}
