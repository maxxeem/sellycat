import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { apexUrl, classifyHost } from "@/lib/site/hosts";

/** Sellycat's public pages (apex only; a shop host gets an empty list). One URL per page, both languages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host");
  if (classifyHost(host).kind !== "apex") return [];
  const site = apexUrl();
  return ["/", "/pricing", "/help", "/legal/imprint", "/legal/terms", "/legal/privacy", "/legal/dpa"].map((path) => ({
    url: `${site}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
