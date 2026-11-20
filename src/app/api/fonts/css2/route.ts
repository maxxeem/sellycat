import { NextResponse, type NextRequest } from "next/server";
import { fetchFontCss } from "@/lib/design/font-css";
import { isSafeFontQuery } from "@/lib/design/font-proxy";

/**
 * Google Fonts CSS, fetched server-side and served from our domain (see font-proxy.ts): visitors never
 * contact Google. Long cache on the CDN.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.search.replace(/^\?/, "");
  if (!isSafeFontQuery(query)) return new NextResponse("Bad font query", { status: 400 });
  const css = await fetchFontCss(query);
  if (css === null) return new NextResponse("Font not available", { status: 502 });
  return new NextResponse(css, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } });
}
