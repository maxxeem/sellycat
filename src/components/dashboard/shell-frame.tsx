"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n/context";
import type { SectionKey } from "@/lib/dashboard/nav";
import { logout, switchTenant } from "@/app/p/[locale]/dashboard/actions";

type Props = {
  user: { name: string; email: string };
  tenants: Array<{ id: string; name: string }>;
  current: { id: string; name: string; slug: string } | null;
  sections: SectionKey[];
  children: ReactNode;
  /** Staff admin reuses the frame with its own menu. */
  nav?: Array<{ href: string; label: string }>;
  homeHref?: string;
};

/** Sidebar layout (drawer on phones), modelled on SwypeCast's admin shell. */
export function ShellFrame({ user, tenants, current, sections, children, nav, homeHref = "/dashboard" }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = nav ?? [{ href: "/dashboard", label: t.dashboard.nav.overview }, ...sections.map((s) => ({ href: `/dashboard/${s}`, label: t.dashboard.nav[s] }))];
  const active = (href: string) => (href === homeHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Menu">
      <Link href={homeHref} className="mb-4 px-2 py-1" onClick={() => setOpen(false)}>
        <Logo width={160} />
      </Link>
      {tenants.length > 1 && current ? (
        <select
          aria-label={t.dashboard.switchShop}
          defaultValue={current.id}
          onChange={(e) => switchTenant(e.target.value)}
          className="mb-3 rounded-input border border-line bg-surface-2 px-2 py-2 text-sm font-semibold"
        >
          {tenants.map((tn) => (
            <option key={tn.id} value={tn.id}>
              {tn.name}
            </option>
          ))}
        </select>
      ) : current ? (
        <p className="mb-3 truncate px-2 text-sm font-semibold">{current.name}</p>
      ) : null}
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          onClick={() => setOpen(false)}
          aria-current={active(item.href) ? "page" : undefined}
          className={`rounded-input px-3 py-2 text-sm font-semibold transition ${active(item.href) ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-ink"}`}
        >
          {item.label}
        </Link>
      ))}
      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
        <div className="px-2 text-sm">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 px-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-sm font-semibold text-muted hover:bg-surface hover:text-ink">
            <LogOut className="h-4 w-4" aria-hidden /> {t.common.logout}
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r border-line bg-surface-2 lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface-2 shadow-pop">{sidebar}</aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3 lg:hidden">
          <button type="button" aria-label="Menu" onClick={() => setOpen(true)} className="rounded-input p-2 hover:bg-surface">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo width={160} />
          <span className="w-9" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
