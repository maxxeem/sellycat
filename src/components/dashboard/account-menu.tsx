"use client";

import { ChevronsUpDown, LogOut, Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/p/[locale]/dashboard/actions";
import { useI18n } from "@/lib/i18n/context";

const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/**
 * The person at the bottom of the sidebar: one compact row (avatar, name, e-mail). A click opens
 * the account menu: profile and account settings, light/dark and sign-out. Switching between shops
 * and the Sellycat admin lives in the workspace switcher at the top of the sidebar.
 */
export function AccountMenu({
  user,
  onNavigate,
}: {
  user: { name: string; email: string };
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const a = t.account;
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface";

  return (
    <div ref={box} className="relative">
      {open ? (
        <div className="absolute inset-x-0 bottom-full z-50 mb-2 rounded-2xl border border-line bg-surface-2 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]" role="menu" data-testid="account-menu">
          <Link href="/dashboard/profile" role="menuitem" className={item} onClick={() => (setOpen(false), onNavigate?.())}>
            <UserRound className="h-4 w-4 text-muted" aria-hidden /> {a.profile}
          </Link>
          <div className="my-1.5 h-px bg-line" />
          <button type="button" role="menuitem" className={item} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="hidden h-4 w-4 text-muted dark:block" aria-hidden />
            <Moon className="h-4 w-4 text-muted dark:hidden" aria-hidden />
            <span className="dark:hidden">{a.dark}</span>
            <span className="hidden dark:inline">{a.light}</span>
          </button>
          <form action={logout}>
            <button type="submit" role="menuitem" className={item}>
              <LogOut className="h-4 w-4 text-muted" aria-hidden /> {t.common.logout}
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface"
        data-testid="account-button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-on-coral">{initials(user.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>
    </div>
  );
}
