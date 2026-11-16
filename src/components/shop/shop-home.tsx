import type { ShopTheme } from "@/lib/shop/theme";
import { DealCard } from "./deal-card";
import type { ShopTexts } from "./shop-texts";
import type { DealView, ShopInfo } from "./types";

/**
 * Start page of a shop: hero, category chips and the deal list in the theme's layout.
 * `activeCategory` comes from the URL (/k/<slug>); previews pass none.
 */
export function ShopHome({
  shop,
  theme,
  t,
  deals,
  categories,
  activeCategory,
  inert = false,
  now,
}: {
  shop: ShopInfo;
  theme: ShopTheme;
  t: ShopTexts;
  deals: DealView[];
  categories: Array<{ name: string; slug: string }>;
  activeCategory?: string | null;
  inert?: boolean;
  now?: Date;
}) {
  const visible = activeCategory ? deals.filter((d) => d.category?.slug === activeCategory) : deals;
  const featured = theme.listLayout === "featured" ? (visible.find((d) => d.featured) ?? visible[0]) : undefined;
  const rest = featured ? visible.filter((d) => d !== featured) : visible;
  const href = (slug: string) => (inert ? undefined : `/d/${slug}`);
  const usedCategories = categories.filter((c) => deals.some((d) => d.category?.slug === c.slug));
  const heroTitle = theme.hero.title || shop.name;

  return (
    <>
      {theme.hero.enabled ? (
        <section className="relative overflow-hidden">
          {theme.hero.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={theme.hero.image} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
            </>
          ) : null}
          <div className={`relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20 ${theme.hero.image ? "text-white" : ""}`}>
            <h1 className="shop-heading max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{heroTitle}</h1>
            {theme.hero.subtitle ? <p className={`mt-4 max-w-2xl text-lg ${theme.hero.image ? "text-white/90" : "text-[var(--shop-muted)]"}`}>{theme.hero.subtitle}</p> : null}
          </div>
        </section>
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {usedCategories.length > 1 ? (
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 py-6 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Categories">
            <a href={inert ? undefined : "/"} className="shop-chip" aria-current={!activeCategory ? "page" : undefined}>
              {t.all}
            </a>
            {usedCategories.map((c) => (
              <a key={c.slug} href={inert ? undefined : `/k/${c.slug}`} className="shop-chip" aria-current={activeCategory === c.slug ? "page" : undefined}>
                {c.name}
              </a>
            ))}
          </nav>
        ) : (
          <div className="h-8" />
        )}

        {!visible.length ? <p className="py-16 text-center text-[var(--shop-muted)]">{t.noDeals}</p> : null}

        {featured ? (
          <div className="mb-8">
            <DealCard deal={featured} shop={shop} t={t} variant="hero" href={href(featured.slug)} now={now} priority />
          </div>
        ) : null}

        {rest.length ? (
          theme.listLayout === "list" ? (
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
    </>
  );
}
