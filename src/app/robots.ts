import type { MetadataRoute } from "next";
import { apexUrl } from "@/lib/site/hosts";

/**
 * Same file on every host (Sellycat and the shops): private areas stay out of search engines.
 * Staging and previews are behind the password gate and send `noindex` anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/auth", "/login", "/signup", "/forgot", "/invite", "/set-password", "/welcome", "/checkout", "/order", "/my", "/v/", "/scan", "/redeem"],
      },
    ],
    sitemap: `${apexUrl()}/sitemap.xml`,
  };
}
