import type { MetadataRoute } from "next";
import { baseOf, indexingAllowed } from "@/lib/shop/seo-server";
import { getShopProfile } from "@/lib/shop/queries";
import { requestShop } from "@/lib/shop/request-shop";
import { apexUrl } from "@/lib/site/hosts";

/**
 * Private areas stay out of search engines, everything public is open to search and AI crawlers;
 * every host names its own sitemap. Staging and previews are closed completely.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { apex, tenantId } = await requestShop();
  if (!indexingAllowed()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const shop = tenantId ? await getShopProfile(tenantId) : null;
  const base = apex ? apexUrl() : shop ? baseOf(shop) : "";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/auth", "/login", "/signup", "/forgot", "/invite", "/set-password", "/welcome", "/checkout", "/order", "/my/", "/my$", "/v/", "/alert/", "/scan", "/redeem"],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
