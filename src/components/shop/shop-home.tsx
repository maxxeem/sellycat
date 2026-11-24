import type { CSSProperties } from "react";
import { heroPictures, type ShopTheme } from "@/lib/shop/theme";
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
  notice,
}: {
  shop: ShopInfo;
  theme: ShopTheme;
  t: ShopTexts;
  deals: DealView[];
  categories: Array<{ name: string; slug: string }>;
  activeCategory?: string | null;
  inert?: boolean;
  now?: Date;
  /** Instead of the deals (e.g. «This shop opens soon» while legal texts are missing); the hero stays. */
  notice?: string;
}) {
  return (
    <>
      {theme.hero.enabled ? <Hero theme={theme} title={theme.hero.title || shop.name} /> : null}

      <div className="shop-below">
      {notice ? (
        <p className="mx-auto max-w-xl px-4 py-24 text-center text-[var(--shop-muted)]" data-testid="shop-not-ready">{notice}</p>
      ) : (
      <ShopDealList shop={shop} layout={theme.listLayout} t={t} deals={deals} categories={categories} activeCategory={activeCategory ?? null} inert={inert} now={now} />
      )}
      </div>
    </>
  );
}

/** 1×1 transparent GIF: what a device loads instead of the picture when the hero is hidden there. */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const MOBILE = "(max-width: 639.98px)";

/** Title area: own picture per device, hard or fading lower edge, compact without a picture (rules in SHOP_CSS). */
function Hero({ theme, title }: { theme: ShopTheme; title: string }) {
  const { subtitle, show, edge } = theme.hero;
  const pictures = heroPictures(theme.hero);
  // A coloured block (header and hero in one) keeps even padding inside; otherwise the text sits on the page.
  const filled = theme.header.style === "integrated" && theme.header.fill !== "none";
  const kind = pictures ? (edge === "fade" ? "shop-hero-image shop-hero-fade" : "shop-hero-image shop-hero-line") : filled ? "shop-hero-filled" : "shop-hero-plain";
  const desktop = pictures ? shopImage(pictures.desktop.url, "100vw") : null;
  const mobile = pictures ? shopImage(pictures.mobile.url, "100vw") : null;
  const mobileSrc = show === "desktop" ? BLANK : (mobile?.srcSet ?? mobile?.src);
  return (
    <section
      className={`shop-hero relative overflow-hidden ${kind}`}
      data-show={show}
      data-testid="shop-hero"
      style={pictures ? ({ "--hero-pos": pictures.desktop.position, "--hero-pos-mobile": pictures.mobile.position } as CSSProperties) : undefined}
    >
      {desktop ? (
        <div className="shop-hero-media absolute inset-0" aria-hidden>
          <picture>
            <source media={MOBILE} srcSet={mobileSrc} sizes="100vw" />
            {show === "mobile" ? <source srcSet={BLANK} /> : null}
            <img {...desktop} alt="" className="shop-hero-img absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
          </picture>
          <div className={edge === "fade" ? "absolute inset-0 bg-black/40" : "absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10"} />
          {/* Keeps the logo readable when the header sits on the picture. */}
          <div className="shop-hero-top-shade absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
        </div>
      ) : null}
      <div className={`shop-hero-text relative mx-auto w-full max-w-6xl px-4 sm:px-6 ${pictures ? "flex flex-col justify-end text-white" : ""}`}>
        <h1 className="shop-heading max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        {subtitle ? <p className={`mt-4 max-w-2xl text-lg ${pictures ? "text-white/90" : ""}`}>{subtitle}</p> : null}
      </div>
    </section>
  );
}

