import type { ShopTheme } from "@/lib/shop/theme";
import { ShopDealList } from "./shop-deal-list";
import { shopImage } from "@/lib/shop/image";
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
  const heroTitle = theme.hero.title || shop.name;

  return (
    <>
      {theme.hero.enabled ? (
        <section className={`shop-hero relative overflow-hidden ${theme.hero.image ? "shop-hero-image" : ""}`}>
          {theme.hero.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...shopImage(theme.hero.image, "100vw")} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
              {/* Keeps the logo readable when the header sits on the picture. */}
              <div className="shop-hero-top-shade absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
            </>
          ) : null}
          <div className={`relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20 ${theme.hero.image ? "text-white" : ""}`}>
            <h1 className="shop-heading max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{heroTitle}</h1>
            {theme.hero.subtitle ? <p className={`mt-4 max-w-2xl text-lg ${theme.hero.image ? "text-white/90" : ""}`}>{theme.hero.subtitle}</p> : null}
          </div>
        </section>
      ) : null}

      <ShopDealList shop={shop} layout={theme.listLayout} t={t} deals={deals} categories={categories} activeCategory={activeCategory ?? null} inert={inert} now={now} />
    </>
  );
}

