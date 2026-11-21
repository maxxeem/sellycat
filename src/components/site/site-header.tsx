"use client";

import { ChevronRight, Globe, LifeBuoy, Menu, Tag, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import onLight from "../../../public/brand/sellycat-on-light-1024.png";
import { useI18n } from "@/lib/i18n/context";
import { LOCALE_COOKIE, LOCALES, LOCALE_LABEL } from "@/lib/i18n/locales";

/** Plain strings only (client component). `cta` follows the signup mode (waitlist / code / start). */
export type SiteHeaderLabels = { brand: string; helpCenter: string; menu: string; closeMenu: string; language: string; login: string; pricing: string; cta: string; ctaHref: string };

const pill = "inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium transition";
const ghost = `${pill} border border-fg/10 bg-fg/[0.04] text-fg/75 backdrop-blur hover:border-fg/20 hover:bg-fg/[0.08] hover:text-fg`;

/** Smooth jump to an anchor on the landing page (long page: jump close first, then glide; instant with reduced motion). */
export function scrollToAnchor(id: string, e?: React.MouseEvent) {
  const target = document.getElementById(id);
  if (!target) return;
  e?.preventDefault();
  const y = target.getBoundingClientRect().top + window.scrollY;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: y, behavior: "instant" });
    return;
  }
  if (Math.abs(y - window.scrollY) > 1200) window.scrollTo({ top: y - Math.sign(y - window.scrollY) * 700, behavior: "instant" });
  requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
}

/** DE | EN as a radio pair (inside the phone menu a dropdown would be clipped). */
function LanguageSegmented({ onChosen }: { onChosen?: () => void }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  return (
    <div role="radiogroup" aria-label={t.common.language} className="inline-flex rounded-full border border-fg/10 bg-fg/[0.04] p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
            onChosen?.();
            router.refresh();
          }}
          className={`h-7 rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.12em] ${locale === l ? "bg-fg text-site-ground" : "text-fg/60"}`}
        >
          {LOCALE_LABEL[l].slice(0, 2)}
        </button>
      ))}
    </div>
  );
}

/**
 * Landing header (ported from the reference landing): logo left; right login, pricing and Help Center (the
 * language switcher lives in the footer, as on every Sellycat page).
 * On phones those fold into a sheet; login stays next to the menu button.
 */
export function SiteHeaderBar({ l }: { l: SiteHeaderLabels }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, [open]);

  const toPricing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    scrollToAnchor("preise", e);
  };
  const toCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (l.ctaHref.startsWith("/#")) scrollToAnchor(l.ctaHref.slice(2), e);
  };

  return (
    <header className="relative z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8" data-testid="site-header">
      <Link href="/" aria-label={l.brand} className="shrink-0">
        <Image src={onLight} alt="Sellycat" width={160} height={Math.round((160 * onLight.height) / onLight.width)} priority />
      </Link>
      <div className="hidden items-center gap-2 sm:flex" data-testid="header-group">
        <Link href="/login" className={`${pill} border border-coral/80 font-semibold text-coral-text hover:bg-coral/10`} data-testid="header-login">
          {l.login}
        </Link>
        <Link href="/#preise" onClick={toPricing} className={ghost} data-testid="header-pricing">
          {l.pricing}
        </Link>
        <Link href="/help" className={ghost} data-testid="help-center">
          {l.helpCenter}
        </Link>
      </div>
      <div ref={root} className="flex items-center gap-2 sm:hidden">
        <Link href="/login" className={`${pill} h-8 border border-coral/80 px-3 font-semibold text-coral-text active:bg-coral/10`} data-testid="header-login-mobile">
          {l.login}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? l.closeMenu : l.menu}
          className={`${ghost} w-8 shrink-0 justify-center !px-0`}
          data-testid="site-menu-toggle"
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        </button>
        {open ? (
          <>
            <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="menu-fade fixed inset-0 z-40 cursor-default bg-site-ground/70 backdrop-blur-md" />
            <div role="menu" className="menu-sheet fixed inset-x-3 top-3 z-50 overflow-hidden rounded-[1.75rem] border border-fg/10 bg-site-sheet/95 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl" data-testid="site-menu">
              <span className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-coral/15 blur-3xl" aria-hidden />
              <div className="relative flex items-center justify-between px-4 pb-2 pt-4">
                <Link href="/" onClick={() => setOpen(false)} aria-label={l.brand}>
                  <Image src={onLight} alt="Sellycat" width={160} height={Math.round((160 * onLight.height) / onLight.width)} />
                </Link>
                <button type="button" onClick={() => setOpen(false)} aria-label={l.closeMenu} className="grid h-9 w-9 place-items-center rounded-full border border-fg/10 bg-fg/[0.05] text-fg/80">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="relative px-3 pb-3 pt-2">
                <div className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.03]">
                  <Link href="/#preise" role="menuitem" onClick={toPricing} className="flex h-14 items-center gap-3 border-b border-fg/[0.08] px-4 text-[16px] text-fg/90 active:bg-fg/[0.06]" data-testid="menu-pricing">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-fg/[0.07]">
                      <Tag className="h-4 w-4 text-coral-text" aria-hidden />
                    </span>
                    <span className="flex-1">{l.pricing}</span>
                    <ChevronRight className="h-4 w-4 text-fg/35" aria-hidden />
                  </Link>
                  <Link href="/help" role="menuitem" onClick={() => setOpen(false)} className="flex h-14 items-center gap-3 px-4 text-[16px] text-fg/90 active:bg-fg/[0.06]">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-fg/[0.07]">
                      <LifeBuoy className="h-4 w-4 text-coral-text" aria-hidden />
                    </span>
                    <span className="flex-1">{l.helpCenter}</span>
                    <ChevronRight className="h-4 w-4 text-fg/35" aria-hidden />
                  </Link>
                  <div className="flex h-14 items-center gap-3 border-t border-fg/[0.08] px-4 text-[16px] text-fg/90">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-fg/[0.07]">
                      <Globe className="h-4 w-4 text-coral-text" aria-hidden />
                    </span>
                    <span className="flex-1">{l.language}</span>
                    <LanguageSegmented onChosen={() => setOpen(false)} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-[1.45fr_1fr] gap-2" data-testid="menu-actions">
                  <Link href={l.ctaHref} role="menuitem" onClick={toCta} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-coral px-3 text-[15px] font-semibold text-on-coral shadow-[0_8px_24px_-8px_rgb(var(--coral-rgb)/0.55)] active:brightness-95" data-testid="menu-start">
                    <span className="truncate">{l.cta}</span>
                  </Link>
                  <Link href="/login" role="menuitem" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-coral/80 px-3 text-[15px] font-semibold text-coral-text active:bg-coral/10">
                    <span className="truncate">{l.login}</span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
