"use client";

import { useEffect, useState } from "react";
import type { ShopTheme } from "@/lib/shop/theme";
import { DealCard } from "./deal-card";
import type { ShopTexts } from "./shop-texts";
import type { DealView, ShopInfo } from "./types";

/** Category slug of a shop path (`/k/<slug>`), null for the start page. */
const categoryOf = (path: string) => {
  const m = /^\/k\/([^/?#]+)/.exec(path);
  return m ? decodeURIComponent(m[1]) : null;
};

/**
 * Category chips and the deal list. Switching a category only filters in the browser (all deals
 * are already loaded) and updates the URL (/k/<slug>), so hero and header stay as they are: no
 * flash. Opening /k/<slug> directly or reloading renders the category on the server.
 */
export function ShopDealList({
  shop,
  layout,
  t,
  deals,
  categories,
  activeCategory,
  inert = false,
  now,
}: {
  shop: ShopInfo;
  layout: ShopTheme["listLayout"];
  t: ShopTexts;
  deals: DealView[];
  categories: Array<{ name: string; slug: string }>;
  activeCategory: string | null;
  inert?: boolean;
  now?: Date;
}) {
  const [active, setActive] = useState(activeCategory);
  const [seen, setSeen] = useState(activeCategory);
  // Follow a new server value (e.g. a link from elsewhere to another category).
  if (seen !== activeCategory) {
    setSeen(activeCategory);
    setActive(activeCategory);
  }

  // Back/forward between categories.
  useEffect(() => {
    if (inert) return;
    const onPop = () => setActive(categoryOf(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [inert]);

  const select = (slug: string | null) => (e: React.MouseEvent) => {
    // Let the browser handle new tabs and the like.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (slug === active) return;
    setActive(slug);
    window.history.pushState(null, "", slug ? `/k/${encodeURIComponent(slug)}` : "/");
  };

  const visible = active ? deals.filter((d) => d.category?.slug === active) : deals;
  const featured = layout === "featured" ? (visible.find((d) => d.featured) ?? visible[0]) : undefined;
  const rest = featured ? visible.filter((d) => d !== featured) : visible;
  const href = (slug: string) => (inert ? undefined : `/d/${slug}`);
  const usedCategories = categories.filter((c) => deals.some((d) => d.category?.slug === c.slug));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <h2 className="sr-only">{categories.find((c) => c.slug === active)?.name ?? t.dealsHeading}</h2>
      {usedCategories.length > 1 ? (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 py-6 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Categories">
          <Chip href={inert ? undefined : "/"} active={!active} onClick={select(null)}>
            {t.all}
          </Chip>
          {usedCategories.map((c) => (
            <Chip key={c.slug} href={inert ? undefined : `/k/${c.slug}`} active={active === c.slug} onClick={select(c.slug)}>
              {c.name}
            </Chip>
          ))}
        </nav>
      ) : (
        <div className="shop-list-top h-8" />
      )}

      {!visible.length ? <p className="py-16 text-center text-[var(--shop-muted)]">{t.noDeals}</p> : null}

      {featured ? (
        <div className="mb-8">
          <DealCard deal={featured} shop={shop} t={t} variant="hero" href={href(featured.slug)} now={now} priority />
        </div>
      ) : null}

      {rest.length ? (
        layout === "list" ? (
          <div className="flex flex-col gap-4">
            {rest.map((d, i) => (
              <DealCard key={d.id} deal={d} shop={shop} t={t} variant="list" href={href(d.slug)} now={now} priority={!featured && i < 2} />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((d, i) => (
              <DealCard key={d.id} deal={d} shop={shop} t={t} variant="grid" href={href(d.slug)} now={now} priority={!featured && i < 2} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function Chip({ href, active, onClick, children }: { href?: string; active: boolean; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  const props = { className: "shop-chip", "aria-current": active ? ("page" as const) : undefined };
  return href ? (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ) : (
    <span {...props}>{children}</span>
  );
}
