import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/locales";
import { classifyHost, siteHost, DEFAULT_ROOT } from "@/lib/site/hosts";
import { resolveShop } from "@/lib/site/resolve-shop";
import { NOT_FOUND_PATH, apexRoute, safeNext, shopRoute, type Route } from "@/lib/site/routing";
import { STAGING_COOKIE, STAGING_GATE_PATH, stagingCookieValid, stagingExempt, stagingGateEnabled } from "@/lib/site/staging-gate";
import { readSession } from "@/lib/supabase/proxy";

/** Request header carrying the original pathname to pages (e.g. for "next" after login). */
export const PATH_HEADER = "x-sc-path";

// Next.js 16: middleware.ts is now proxy.ts (same semantics).
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = classifyHost(rawHost);
  const root = siteHost() || DEFAULT_ROOT;

  // Staging: every page behind the password gate (cookie for the whole staging domain).
  if (stagingGateEnabled() && !stagingExempt(pathname) && !(await stagingCookieValid(request.cookies.get(STAGING_COOKIE)?.value))) {
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
    const gate = new URL(STAGING_GATE_PATH, `${proto}://${root}`);
    gate.searchParams.set("next", `${proto}://${rawHost}${pathname}${search}`);
    return NextResponse.redirect(gate);
  }

  let route: Route;
  if (host.kind === "apex") {
    route = apexRoute(pathname, resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language")));
  } else {
    route = isPassThroughPath(pathname) ? { type: "pass" } : shopRoute(pathname, await resolveShop(host));
  }

  if (route.type === "pass") return NextResponse.next({ request: { headers: forwardHeaders(request) } });
  if (route.type === "not_found") return rewrite(request, NOT_FOUND_PATH);

  // Shops are public: no session work, so they stay fast and cacheable.
  if (route.area === "shop" || route.area === "public") return rewrite(request, route.path);

  const session = await readSession(request);

  if (route.area === "dashboard" && !session.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return session.apply(NextResponse.redirect(login));
  }
  if (route.area === "staff") {
    // The staff admin never hints at its existence: plain 404 for everyone else.
    if (!session.user || !(await session.isStaff())) return session.apply(rewrite(request, NOT_FOUND_PATH));
  }
  if (route.area === "auth" && session.user && (pathname === "/login" || pathname === "/signup")) {
    const next = request.nextUrl.searchParams.get("next");
    return session.apply(NextResponse.redirect(new URL(safeNext(next), request.url)));
  }
  return session.apply(rewrite(request, route.path));
}

function isPassThroughPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/") || pathname.startsWith("/_next/");
}

/** Built at the last moment, so cookies refreshed by readSession() reach the page. */
function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return headers;
}

function rewrite(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url, { request: { headers: forwardHeaders(request) } });
}

export const config = {
  // Everything except Next internals and static files (shop hosts need every path).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|android-chrome-.*|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|txt|xml|webmanifest)$).*)"],
};
