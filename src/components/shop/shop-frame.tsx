import Link from "next/link";
import { SocialIcons } from "./social-icons";
import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { shopImage } from "@/lib/shop/image";
import { readableOn } from "@/lib/design/color";
import { headerLook, type ShopTheme } from "@/lib/shop/theme";
import type { ShopTexts } from "./shop-texts";
import { CookieSettingsLink } from "./consent";

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
  cookieSettings = false,
}: {
  name: string;
  theme: ShopTheme;
  t: ShopTexts;
  children: ReactNode;
  contact?: { email?: string | null; phone?: string | null };
  inert?: boolean;
  /** Free plan: a visible "Powered by Sellycat" badge; paid plans show no Sellycat branding. */
  branding?: boolean;
  /** The shop uses consent-based analytics: offer a link to change the choice. */
  cookieSettings?: boolean;
}) {
  // Two logo variants: the stylesheet shows the one that fits the header's background.
  const forLight = theme.logoLight || theme.logoDark;
  const forDark = theme.logoDark || theme.logoLight;
  const tone = headerLook(theme).tone;
  // The footer sits on the surface colour: the logo variant made for that background.
  const footerDark = readableOn(theme.colors.surface, "#111111", "#ffffff") === "#ffffff";
  const footerLogo = footerDark ? forDark : forLight;
  const a = (href: string) => (inert ? { href: "#", onClick: undefined, tabIndex: -1 } : { href });
  return (
    // Pages shorter than the screen still end with the footer at the bottom (previews fill their box).
    <div className={`flex flex-col ${inert ? "min-h-full" : "min-h-dvh"}`}>
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
      <footer className="mt-20 border-t border-[var(--shop-line)] bg-[var(--shop-surface)] text-sm text-[var(--shop-muted)]" data-testid="shop-footer">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            {footerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...shopImage(footerLogo, "160px")} alt={name} className="h-9 w-auto max-w-[160px] self-start object-contain" data-testid="shop-footer-logo" />
            ) : (
              <p className="shop-heading text-lg font-bold text-[var(--shop-text)]">{name}</p>
            )}
            {contact?.email || contact?.phone ? (
              <ul className="flex flex-col gap-2.5">
                {contact?.email ? (
                  <li>
                    <a {...a(`mailto:${contact.email}`)} className="inline-flex items-center gap-2.5 break-all hover:text-[var(--shop-text)]">
                      <Mail className="h-4 w-4 shrink-0" aria-hidden /> {contact.email}
                    </a>
                  </li>
                ) : null}
                {contact?.phone ? (
                  <li>
                    <a {...a(`tel:${contact.phone.replace(/\s/g, "")}`)} className="inline-flex items-center gap-2.5 hover:text-[var(--shop-text)]">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden /> {contact.phone}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <SocialIcons links={theme.socialLinks} inert={inert} />
          </div>
          <FooterColumn title={t.footerShop}>
            <li>
              <Link {...a("/")} className="hover:text-[var(--shop-text)]">{t.footerAllDeals}</Link>
            </li>
            <li>
              <Link {...a("/my")} className="hover:text-[var(--shop-text)]">{t.myVouchers}</Link>
            </li>
            {theme.footerLinks.map((l) => (
              <li key={`${l.label}${l.url}`}>
                <a {...a(l.url)} className="hover:text-[var(--shop-text)]" rel="noopener">
                  {l.label}
                </a>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title={t.footerLegal}>
            <li>
              <Link {...a("/impressum")} className="hover:text-[var(--shop-text)]">{t.imprint}</Link>
            </li>
            <li>
              <Link {...a("/agb")} className="hover:text-[var(--shop-text)]">{t.terms}</Link>
            </li>
            <li>
              <Link {...a("/datenschutz")} className="hover:text-[var(--shop-text)]">{t.privacy}</Link>
            </li>
            {cookieSettings && !inert ? (
              <li>
                <CookieSettingsLink label={t.cookieSettings} />
              </li>
            ) : null}
          </FooterColumn>
        </div>
        <div className="border-t border-[var(--shop-line)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {name}</p>
            {branding ? (
              <a
                href="https://sellycat.com/?ref=shop"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-line)] bg-[var(--shop-bg)] px-3.5 py-1.5 font-semibold text-[var(--shop-text)] hover:border-[var(--shop-text)]"
                tabIndex={inert ? -1 : undefined}
                data-testid="sellycat-branding"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-[#FF4B23]" aria-hidden />
                {t.poweredBy}
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A titled link list of the footer; links stack one per line (also on phones). */
function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--shop-text)]">{title}</p>
      <ul className="flex flex-col gap-3">{children}</ul>
    </nav>
  );
}
