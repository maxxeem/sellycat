import { getDictionary } from "@/lib/i18n";
import { getShopProfile } from "@/lib/shop/queries";

export function generateStaticParams() {
  return [{ tenant: "00000000-0000-0000-0000-000000000000" }];
}

/** Web app manifest of the redemption app (installable per shop, opens on /scan). */
export async function GET(_: Request, { params }: RouteContext<"/shop/[locale]/[tenant]/scan/manifest">) {
  const shop = await getShopProfile((await params).tenant);
  if (!shop) return new Response("Not found", { status: 404 });
  const t = getDictionary(shop.locale);
  const icons = [
    ...(shop.theme.favicon ? [{ src: shop.theme.favicon, sizes: "any", purpose: "any" }] : []),
    { src: "/android-chrome-192.png", sizes: "192x192", type: "image/png" },
    { src: "/android-chrome-512.png", sizes: "512x512", type: "image/png" },
  ];
  const manifest = {
    id: "/scan",
    name: `${t.redeem.title} · ${shop.name}`,
    short_name: t.redeem.title,
    lang: shop.locale,
    start_url: "/scan",
    scope: "/scan",
    display: "standalone",
    orientation: "portrait",
    background_color: shop.theme.colors.background,
    theme_color: shop.theme.colors.primary,
    icons,
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" },
  });
}
