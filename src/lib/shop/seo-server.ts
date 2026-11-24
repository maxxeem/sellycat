import "server-only";
import type { Metadata } from "next";
import { siteHost } from "@/lib/site/hosts";
import type { ShopProfile } from "./queries";
import { shopBase, type SeoText, type ShopSchemaInput } from "./seo";
import { headerLogo } from "./theme";

/** Search engines only ever index production; staging and previews never. */
export const indexingAllowed = () => !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

export const baseOf = (shop: Pick<ShopProfile, "primaryHost">) => shopBase(shop.primaryHost, siteHost());

export function schemaInput(shop: ShopProfile, description?: string): ShopSchemaInput {
  return {
    name: shop.name,
    currency: shop.currency,
    locale: shop.locale,
    base: baseOf(shop),
    logo: headerLogo(shop.theme) || shop.theme.logoLight || shop.theme.logoDark || null,
    email: shop.settings.contact_email,
    phone: shop.settings.contact_phone,
    sameAs: shop.theme.socialLinks.map((l) => l.url).filter((u) => u.startsWith("https://")),
    description,
  };
}

/** Complete head tags of one shop page (Next replaces openGraph as a whole, so nothing is inherited). */
export function pageMetadata(shop: ShopProfile, path: string, text: SeoText, options: { image?: string; index?: boolean; type?: "website" | "article" } = {}): Metadata {
  const base = baseOf(shop);
  const url = base ? `${base}${path}` : undefined;
  const image = options.image ?? (shop.theme.socialImage || undefined);
  const index = (options.index ?? true) && shop.state === "online" && indexingAllowed();
  return {
    title: { absolute: text.title },
    description: text.description,
    alternates: url ? { canonical: url } : undefined,
    robots: index ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } : { index: false, follow: true },
    openGraph: { siteName: shop.name, type: "website", title: text.title, description: text.description, url, images: image ? [{ url: image, ...(options.image ? { width: 1200, height: 630 } : {}), alt: text.title }] : undefined, locale: shop.locale === "de" ? "de_CH" : "en_GB" },
    twitter: { card: image ? "summary_large_image" : "summary", title: text.title, description: text.description, images: image ? [image] : undefined },
  };
}
