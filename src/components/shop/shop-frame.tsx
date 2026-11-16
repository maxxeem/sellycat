import Link from "next/link";
import type { ReactNode } from "react";
import type { ShopTheme } from "@/lib/shop/theme";
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
}: {
  name: string;
  theme: ShopTheme;
  t: ShopTexts;
  children: ReactNode;
  contact?: { email?: string | null; phone?: string | null };
  inert?: boolean;
}) {
  const logo = theme.mode === "dark" ? theme.logoDark || theme.logoLight : theme.logoLight || theme.logoDark;
  const a = (href: string) => (inert ? { href: "#", onClick: undefined, tabIndex: -1 } : { href });
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[var(--shop-line)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
          <Link {...a("/")} className="flex min-w-0 items-center" aria-label={name}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={name} className="h-9 w-auto max-w-[200px] object-contain sm:h-11" />
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
            <Link {...a("/impressum")} className="hover:text-[var(--shop-text)]">{t.imprint}</Link>
            <Link {...a("/agb")} className="hover:text-[var(--shop-text)]">{t.terms}</Link>
            <Link {...a("/datenschutz")} className="hover:text-[var(--shop-text)]">{t.privacy}</Link>
          </nav>
          <div className="flex flex-col gap-1 sm:items-end">
            {contact?.email ? <a {...a(`mailto:${contact.email}`)} className="hover:text-[var(--shop-text)]">{contact.email}</a> : null}
            {contact?.phone ? <a {...a(`tel:${contact.phone.replace(/\s/g, "")}`)} className="hover:text-[var(--shop-text)]">{contact.phone}</a> : null}
            <a href="https://sellycat.com" className="text-xs opacity-70 hover:opacity-100" tabIndex={inert ? -1 : undefined}>{t.poweredBy}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
