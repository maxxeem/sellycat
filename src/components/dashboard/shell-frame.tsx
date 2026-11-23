"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { BookOpen, Buildings, ChartLineUp, ClockCounterClockwise, House, Key, Lifebuoy, Tag, Tray, type IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { DashboardMenu } from "./menu";
import { AccountMenu } from "./account-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { MemberRole } from "@/lib/auth/roles";
import { Logo } from "@/components/brand";

type Props = {
  user: { name: string; email: string };
  tenants: Array<{ id: string; name: string }>;
  current: { id: string; name: string; slug: string; role?: MemberRole } | null;
  children: ReactNode;
  /** Staff admin reuses the frame with its own menu (icon by key, components cannot cross from the server). */
  nav?: Array<{ href: string; label: string; icon?: StaffIcon }>;
  homeHref?: string;
  /** May switch to the Sellycat admin (and back). */
  isStaff?: boolean;
};

const STAFF_ICONS = { home: House, tenants: Buildings, analytics: ChartLineUp, plans: Tag, requests: Tray, support: Lifebuoy, help: BookOpen, access: Key, audit: ClockCounterClockwise } satisfies Record<string, ComponentType<IconProps>>;
export type StaffIcon = keyof typeof STAFF_ICONS;

/** Sidebar layout (drawer on phones), modelled on SwypeCast's admin shell. */
export function ShellFrame({ user, tenants, current, children, nav, homeHref = "/dashboard", isStaff = false }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === homeHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Menu">
      <Link href={homeHref} className="mb-4 px-2 py-1" onClick={() => setOpen(false)}>
        <Logo width={160} />
      </Link>
      <WorkspaceSwitcher tenants={tenants} currentId={current?.id ?? null} isStaff={isStaff} inStaff={Boolean(nav)} />
      {nav ? (
        nav.map((item) => {
          const Icon = item.icon ? STAFF_ICONS[item.icon] : null;
          const on = active(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition ${on ? "bg-accent/10 font-semibold text-accent-text" : "text-muted hover:bg-surface hover:text-ink"}`}
            >
              {Icon ? <Icon size={19} weight="light" className="shrink-0 opacity-80" aria-hidden /> : null}
              {item.label}
            </Link>
          );
        })
      ) : (
        <DashboardMenu isActive={active} onNavigate={() => setOpen(false)} role={current?.role} />
      )}
      <div className="mt-auto border-t border-line pt-3">
        <AccountMenu user={user} onNavigate={() => setOpen(false)} />
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
