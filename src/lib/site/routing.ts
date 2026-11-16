/**
 * Request routing (pure, unit-tested; the proxy applies the result).
 *
 * Internally the app has two trees, each with its own root layout:
 *   /p/[locale]/…           Sellycat's own pages on the apex (placeholder, auth, dashboard, staff)
 *   /shop/[locale]/[tenant] the public shops (any shop host)
 * Visitors never see these prefixes: the proxy rewrites, and direct requests to them are 404.
 * The staff admin lives at /p/[locale]/staff and is only reachable as /admin on the apex.
 */
import type { Locale } from "@/lib/i18n/locales";

export const NOT_FOUND_PATH = "/_not-found-rewrite";
const INTERNAL_PREFIXES = ["/p", "/shop", "/staff"];

export type Route =
  | { type: "pass" }
  | { type: "not_found" }
  | { type: "rewrite"; path: string; area: "public" | "auth" | "dashboard" | "staff" | "shop" };

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
const isInternal = (pathname: string) => INTERNAL_PREFIXES.some((p) => under(pathname, p));

/** Paths that are the same on every host (route handlers, Next internals). */
export function isPassThrough(pathname: string): boolean {
  return under(pathname, "/api") || pathname.startsWith("/_next/") || pathname === NOT_FOUND_PATH;
}

export const AUTH_PATHS = ["/login", "/signup", "/forgot", "/set-password", "/auth"];

export function apexRoute(pathname: string, locale: Locale): Route {
  if (isPassThrough(pathname)) return { type: "pass" };
  if (isInternal(pathname)) return { type: "not_found" };
  if (under(pathname, "/admin")) return { type: "rewrite", path: `/p/${locale}/staff${pathname.slice("/admin".length)}`, area: "staff" };
  const area = under(pathname, "/dashboard") ? "dashboard" : AUTH_PATHS.some((p) => under(pathname, p)) ? "auth" : "public";
  return { type: "rewrite", path: `/p/${locale}${pathname === "/" ? "" : pathname}`, area };
}

export function shopRoute(pathname: string, tenant: { id: string; locale: string } | null): Route {
  if (isPassThrough(pathname)) return { type: "pass" };
  if (!tenant || isInternal(pathname)) return { type: "not_found" };
  return { type: "rewrite", path: `/shop/${tenant.locale}/${tenant.id}${pathname === "/" ? "" : pathname}`, area: "shop" };
}

/** Only same-site relative paths are accepted as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
