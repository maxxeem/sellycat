"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sub-navigation; the visible path is /admin/access/… (rewritten internally). */
export function AccessTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const path = usePathname().replace(/^\/p\/[a-z]{2}\/staff/, "/admin");
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => path === t.href || path.startsWith(`${t.href}/`))?.href;
  return (
    <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active === t.href ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${active === t.href ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
