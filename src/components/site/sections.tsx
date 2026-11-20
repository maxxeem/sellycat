import Link from "next/link";
import { Suspense } from "react";
import { WaitlistForm } from "@/components/access/waitlist-form";
import type { SignupCta } from "@/lib/access/rules";
import type { Dictionary } from "@/lib/i18n";
import { SiteHeaderBar } from "./site-header";
import { CtaLink } from "./cta-link";

/** The one filled button of the landing (coral, ink text), as on the reference landing. */
export const primaryBtn = "inline-flex h-12 items-center justify-center rounded-full bg-coral px-7 text-sm font-semibold text-on-coral transition hover:brightness-95";

export const ctaLabel = (t: Dictionary, cta: SignupCta) => t.site.cta[cta.kind === "waitlist" ? "waitlist" : cta.kind === "code" ? "code" : "start"];

export function SiteHeader({ t, cta }: { t: Dictionary; cta: SignupCta }) {
  const n = t.site.nav;
  return <SiteHeaderBar l={{ brand: t.common.brand, helpCenter: n.helpCenter, menu: n.menu, closeMenu: n.closeMenu, language: n.language, login: t.common.login, pricing: n.pricing, cta: ctaLabel(t, cta), ctaHref: cta.href }} />;
}

export function Hero({ t, cta }: { t: Dictionary; cta: SignupCta }) {
  const h = t.site.hero;
  return (
    // Short: the bands start right below and peek into the first screen; z-10 keeps the CTA above their veil.
    <section className="relative isolate z-10 pb-16 pt-12 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24" data-testid="hero">
      <div className="pointer-events-none absolute inset-x-0 -bottom-48 -top-32 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" aria-hidden>
        <span className="ambient-a absolute -left-[18%] -top-[20%] h-[70vmax] w-[70vmax] rounded-full bg-[rgb(var(--glow-rgb))] opacity-[0.5] blur-[130px] will-change-transform" />
        <span className="ambient-b absolute -right-[22%] -top-[15%] h-[52vmax] w-[52vmax] rounded-full bg-coral blur-[150px] will-change-transform" style={{ opacity: 0.07 }} />
        <span className="ambient-c absolute left-[30%] top-[30%] h-[36vmax] w-[36vmax] rounded-full bg-[rgb(var(--glow2-rgb))] opacity-[0.35] blur-[120px] will-change-transform" />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 text-center sm:px-8">
        <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{h.claim}</h1>
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-fg/70 sm:text-xl">{h.subtitle}</p>
        <CtaLink href={cta.href} className={`${primaryBtn} mt-2`} testId="hero-cta">
          {ctaLabel(t, cta)}
        </CtaLink>
      </div>
    </section>
  );
}

/**
 * Closing box: a sentence and the CTA; while signup is closed the box holds the waitlist form itself
 * (anchor #warteliste), with a way in for people who already have a code.
 */
export function FinalCta({ t, cta, turnstileKey }: { t: Dictionary; cta: SignupCta; turnstileKey: string | null }) {
  const box = "flex flex-col items-center gap-6 rounded-3xl border border-coral/30 bg-[radial-gradient(circle_at_50%_0%,rgb(var(--coral-rgb)/0.14),transparent_60%)] px-6 py-14 text-center";
  if (cta.kind === "waitlist")
    return (
      <section className="site-section mx-auto max-w-6xl scroll-mt-6 px-5 sm:px-8" id="warteliste" data-testid="final-cta">
        <div className={`${box} sm:px-10`}>
          <h2 className="max-w-xl text-2xl font-semibold sm:text-3xl">{t.site.finalCta.textWaitlist}</h2>
          <p className="max-w-xl text-fg/65">{t.site.waitlist.intro}</p>
          <div className="w-full max-w-2xl">
            <Suspense fallback={<div className="h-[34rem]" />}>
              <WaitlistForm turnstileKey={turnstileKey} />
            </Suspense>
          </div>
          <p className="text-sm text-fg/60">
            {t.site.waitlist.haveCode}{" "}
            <Link href="/signup" className="font-semibold text-coral-text underline underline-offset-4">
              {t.site.waitlist.redeem}
            </Link>
          </p>
        </div>
      </section>
    );
  return (
    <section className="site-section mx-auto max-w-6xl px-5 sm:px-8" data-testid="final-cta">
      <div className={box}>
        <p className="max-w-xl text-2xl font-semibold sm:text-3xl">{t.site.finalCta.text}</p>
        <CtaLink href={cta.href} className={primaryBtn}>
          {ctaLabel(t, cta)}
        </CtaLink>
      </div>
    </section>
  );
}
