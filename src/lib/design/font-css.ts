import "server-only";
import { cacheLife } from "next/cache";
import { FONT_CSS_PATH, isSafeFontQuery, rewriteFontCss } from "./font-proxy";

/** A modern user agent makes Google answer with woff2. */
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Google's CSS for a css2 query, font URLs pointing at our file route. null = not available. */
export async function fetchFontCss(query: string): Promise<string | null> {
  if (!isSafeFontQuery(query)) return null;
  const upstream = await fetch(`https://fonts.googleapis.com/css2?${query}`, { headers: { "user-agent": UA }, next: { revalidate: 86400 } }).catch(() => null);
  if (!upstream || !upstream.ok) return null;
  return rewriteFontCss(await upstream.text());
}

/**
 * The same CSS for inlining into a page (saves a render-blocking request per font). Takes our
 * proxy URLs (`/api/fonts/css2?…`); "" when it cannot be loaded, so the caller keeps the link.
 */
export async function inlineFontCss(href: string): Promise<string> {
  "use cache";
  cacheLife("days");
  if (!href.startsWith(`${FONT_CSS_PATH}?`)) return "";
  return (await fetchFontCss(href.slice(FONT_CSS_PATH.length + 1))) ?? "";
}
