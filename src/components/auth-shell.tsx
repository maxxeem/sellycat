import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { SiteFooter } from "./site-footer";

/**
 * Sign-in, signup and password pages: logo, one centred card on a quiet background with a soft
 * coral glow, and the compact footer (legal links, copyright, language).
 */
export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-surface">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--coral)_14%,transparent),transparent)]" aria-hidden />
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="flex w-full max-w-[26rem] flex-col items-center gap-8">
          <Link href="/" aria-label="Sellycat">
            <Logo width={170} priority />
          </Link>
          <section className="w-full rounded-card border border-line bg-surface-2 p-6 shadow-pop sm:p-8">
            <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
            {children}
          </section>
          {footer ? <div className="text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </div>
      <div className="relative">
        <SiteFooter compact />
      </div>
    </main>
  );
}
