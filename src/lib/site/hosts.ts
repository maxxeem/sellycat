/**
 * Host classification (isomorphic, pure, unit-tested). Every request is one of:
 *
 * - apex:   sellycat.com / www.sellycat.com (placeholder, login, signup, dashboard, staff admin)
 * - shop:   <slug>.sellycat.com (resolved by slug) or any other host (a customer's own domain,
 *           resolved by hostname via the database)
 * - dev:    localhost and *.vercel.app deployment URLs: behave like the apex
 *
 * The root comes from NEXT_PUBLIC_SITE_URL (production: sellycat.com, staging: staging.sellycat.com).
 * On localhost, <slug>.localhost:<port> is a shop, so tenants can be tried locally.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";
export const DEFAULT_ROOT = "sellycat.com";

/** Host (with port) of the configured site, without www; "" when not configured. */
export function siteHost(): string {
  try {
    return SITE ? new URL(SITE).host.toLowerCase().replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export const RESERVED_SLUGS = new Set([
  "www", "admin", "api", "app", "dashboard", "mail", "smtp", "imap", "ftp", "cdn", "static", "assets", "status",
  "help", "support", "blog", "docs", "dev", "staging", "preview", "test", "login", "signup", "staff", "shop",
  "shops", "deals", "sellycat", "billing", "pay", "checkout", "wallet", "redeem", "auth", "id", "account",
]);

/** 3–40 chars, a–z 0–9 and hyphens, no leading/trailing hyphen, not reserved. */
export function validateSlug(value: string): { ok: true } | { ok: false; reason: "empty" | "format" | "reserved" } {
  if (!value) return { ok: false, reason: "empty" };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(value) || value.includes("--")) return { ok: false, reason: "format" };
  if (RESERVED_SLUGS.has(value)) return { ok: false, reason: "reserved" };
  return { ok: true };
}

/** Turns a company name into a slug proposal ("Café Zürich AG" → "cafe-zuerich-ag"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function normaliseHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/\.$/, "");
}

const stripPort = (h: string) => h.replace(/:\d+$/, "");

export type HostKind = { kind: "apex" } | { kind: "shop-slug"; slug: string } | { kind: "shop-domain"; host: string };

const DEV_ROOTS = ["localhost"];

/** Classifies a request host. `root` defaults to the configured site host. */
export function classifyHost(rawHost: string | null | undefined, root = siteHost() || DEFAULT_ROOT): HostKind {
  const host = stripPort(normaliseHost(rawHost));
  const r = stripPort(root.toLowerCase());
  if (!host || host === r || host === `www.${r}`) return { kind: "apex" };
  // Deployment URLs and plain localhost behave like the apex (previews, local development).
  if (host.endsWith(".vercel.app") || host === "127.0.0.1" || DEV_ROOTS.includes(host)) return { kind: "apex" };
  for (const base of [r, ...DEV_ROOTS]) {
    if (!host.endsWith(`.${base}`)) continue;
    const sub = host.slice(0, -(base.length + 1));
    // Only one label below the root is a shop; deeper names (a.b.sellycat.com) are not ours.
    if (!sub || sub.includes(".") || sub === "www") return { kind: "apex" };
    return { kind: "shop-slug", slug: sub };
  }
  // On production, any other host reaching the deployment is a customer's own domain.
  return { kind: "shop-domain", host };
}

/** Public shop base URL for a slug: https://<slug>.<root>. */
export function shopUrlForSlug(slug: string, root = siteHost() || DEFAULT_ROOT): string {
  const local = root.startsWith("localhost");
  return `${local ? "http" : "https"}://${slug}.${root}`;
}

/** https://<root> of the platform (sellycat.com, staging.sellycat.com, http://localhost:3000). */
export function apexUrl(root = siteHost() || DEFAULT_ROOT): string {
  return `${root.startsWith("localhost") ? "http" : "https"}://${root}`;
}
