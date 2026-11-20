import Link from "next/link";
import type { ReactNode } from "react";
import { shopImage } from "@/lib/shop/image";
import { headerLook, type ShopTheme } from "@/lib/shop/theme";
import type { ShopTexts } from "./shop-texts";

/**
 * Header and footer of a shop (shop pages and editor previews). Internal links navigate client-side
 * (paths relative to the shop host, the frame stays); previews pass `inert` to keep clicks inside the editor.
 */
export function ShopFrame({
  name,
  theme,
  t,
  children,
  contact,
  inert = false,
  branding = false,
}: {
  name: string;
  theme: ShopTheme;
  t: ShopTexts;
  children: ReactNode;
  contact?: { email?: string | null; phone?: string | null };
  inert?: boolean;
  /** Free plan: a visible "Powered by Sellycat" badge; paid plans show no Sellycat branding. */
  branding?: boolean;
}) {
  // Two logo variants: the stylesheet shows the one that fits the header's background.
  const forLight = theme.logoLight || theme.logoDark;
  const forDark = theme.logoDark || theme.logoLight;
  const tone = headerLook(theme).tone;
  const a = (href: string) => (inert ? { href: "#", onClick: undefined, tabIndex: -1 } : { href });
  return (
    <div className="flex min-h-full flex-col">
      <header className="shop-header" data-tone={tone}>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
          <Link {...a("/")} className="flex min-w-0 items-center" aria-label={name}>
            {forLight ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img {...shopImage(forLight, "200px")} alt={name} className="shop-logo-for-light h-9 w-auto max-w-[200px] object-contain sm:h-11" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img {...shopImage(forDark, "200px")} alt="" aria-hidden className="shop-logo-for-dark h-9 w-auto max-w-[200px] object-contain sm:h-11" />
              </>
            ) : (
              <span className="shop-heading truncate text-xl font-bold">{name}</span>
            )}
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-[var(--shop-line)] text-sm text-[var(--shop-muted)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            {theme.footerLinks.map((l) => (
              <a key={`${l.label}${l.url}`} {...a(l.url)} className="hover:text-[var(--shop-text)]" rel="noopener">
                {l.label}
              </a>
            ))}
            <Link {...a("/my")} className="hover:text-[var(--shop-text)]">{t.myVouchers}</Link>
            <Link {...a("/impressum")} className="hover:text-[var(--shop-text)]">{t.imprint}</Link>
            <Link {...a("/agb")} className="hover:text-[var(--shop-text)]">{t.terms}</Link>
            <Link {...a("/datenschutz")} className="hover:text-[var(--shop-text)]">{t.privacy}</Link>
          </nav>
          <div className="flex flex-col gap-1 sm:items-end">
            {contact?.email ? <a {...a(`mailto:${contact.email}`)} className="hover:text-[var(--shop-text)]">{contact.email}</a> : null}
            {contact?.phone ? <a {...a(`tel:${contact.phone.replace(/\s/g, "")}`)} className="hover:text-[var(--shop-text)]">{contact.phone}</a> : null}
          </div>
        </div>
        {branding ? (
          <div className="flex justify-center pb-8">
            <a
              href="https://sellycat.com/?ref=shop"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-line)] bg-[var(--shop-surface)] px-4 py-2 text-xs font-semibold text-[var(--shop-text)] shadow-sm hover:border-[var(--shop-text)]"
              tabIndex={inert ? -1 : undefined}
              data-testid="sellycat-branding"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FF4B23]" aria-hidden />
              {t.poweredBy}
            </a>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
