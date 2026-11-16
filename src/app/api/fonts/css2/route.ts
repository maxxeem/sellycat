import { NextResponse, type NextRequest } from "next/server";
import { isSafeFontQuery, rewriteFontCss } from "@/lib/design/font-proxy";

/**
 * Google Fonts CSS, fetched server-side and served from our domain (see font-proxy.ts): visitors never
 * contact Google. A modern user agent makes Google answer with woff2; long cache on the CDN.
 */
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.search.replace(/^\?/, "");
  if (!isSafeFontQuery(query)) return new NextResponse("Bad font query", { status: 400 });
  const upstream = await fetch(`https://fonts.googleapis.com/css2?${query}`, { headers: { "user-agent": UA }, next: { revalidate: 86400 } }).catch(() => null);
  if (!upstream || !upstream.ok) return new NextResponse("Font not found", { status: upstream?.status === 400 ? 404 : 502 });
  const css = rewriteFontCss(await upstream.text());
  return new NextResponse(css, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } });
}
