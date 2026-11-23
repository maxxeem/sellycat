import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ConsentBanner } from "@/components/shop/consent";
import { ShopFrame } from "@/components/shop/shop-frame";
import { SHOP_CSS, pageChromeCss, themeAttrs, themeStyle } from "@/components/shop/shop-styles";
import { shopTexts } from "@/components/shop/shop-texts";
import { getShopProfile } from "@/lib/shop/queries";
import { themeFontCss } from "@/lib/shop/theme";
import { inlineFontCss } from "@/lib/design/font-css";

// Cache Components needs one param to validate the route; real shops render on demand and are
// then cached per tenant (tag `shop:<id>`).
export function generateStaticParams() {
  return [{ tenant: "00000000-0000-0000-0000-000000000000" }];
}

export async function generateMetadata({ params }: LayoutProps<"/shop/[locale]/[tenant]">): Promise<Metadata> {
  "use cache";
  const shop = await getShopProfile((await params).tenant);
  if (!shop) return { title: "Shop" };
  return {
    title: { default: shop.name, template: `%s · ${shop.name}` },
    description: shop.settings.seo_description ?? undefined,
    icons: shop.theme.favicon ? [{ url: shop.theme.favicon }] : undefined,
    openGraph: { siteName: shop.name, type: "website", images: shop.theme.socialImage ? [shop.theme.socialImage] : undefined, locale: shop.locale === "de" ? "de_CH" : "en_GB" },
  };
}

export default function ShopLayout({ children, params }: LayoutProps<"/shop/[locale]/[tenant]">) {
  return (
    <Suspense fallback={null}>
      <Shell tenant={params.then((p) => p.tenant)}>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ tenant, children }: { tenant: Promise<string>; children: ReactNode }) {
  const shop = await getShopProfile(await tenant);
  if (!shop) notFound();
  const t = shopTexts(shop.locale);
  const fonts = themeFontCss(shop.theme);
  // Font CSS inline instead of a stylesheet request each (render-blocking on slow networks).
  const inlined = await Promise.all(fonts.links.map(inlineFontCss));
  const links = fonts.links.filter((_, i) => !inlined[i]);
  return (
    <div className="shop-root min-h-dvh" style={themeStyle(shop.theme)} {...themeAttrs(shop.theme)}>
      {links.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <style>{SHOP_CSS + pageChromeCss(shop.theme) + inlined.join("") + fonts.faces}</style>
      <ShopFrame name={shop.name} theme={shop.theme} t={t} contact={{ email: shop.settings.contact_email, phone: shop.settings.contact_phone }} branding={shop.settings.branding === true} cookieSettings={Boolean(shop.settings.ga4_id || shop.settings.meta_pixel_id)}>
        {children}
      </ShopFrame>
      {shop.settings.ga4_id || shop.settings.meta_pixel_id ? <ConsentBanner ga4={shop.settings.ga4_id} metaPixel={shop.settings.meta_pixel_id} t={t} /> : null}
    </div>
  );
}
