import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { SiteFooter } from "./site-footer";

/** Centered card for login, signup and password pages. */
export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-surface">
      <div className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="flex w-full max-w-sm justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-8">
          <Link href="/" aria-label="Sellycat">
            <Logo width={180} priority />
          </Link>
          <section className="w-full rounded-card border border-line bg-surface-2 p-6 shadow-pop">
            <h1 className="mb-5 text-xl font-bold">{title}</h1>
            {children}
          </section>
          {footer ? (
            <div className="text-center text-sm text-muted">{footer}</div>
          ) : null}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
