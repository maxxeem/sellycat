/**
 * Google Fonts through our own domain. The player, the creator and the font pickers ask for a family by
 * name; instead of the browser calling fonts.googleapis.com / fonts.gstatic.com (which hands every
 * visitor's IP address to Google and would need consent), they call `/api/fonts/css2` with the same
 * query, and the font files come from `/api/fonts/file/…`. Isomorphic, unit-tested.
 */
export const FONT_CSS_PATH = "/api/fonts/css2";
export const FONT_FILE_PATH = "/api/fonts/file/";
const GSTATIC = "https://fonts.gstatic.com/";

/** The css2 query exactly as Google expects it (`family=Name+Two:wght@400;700&display=swap`). */
export function fontCssUrl(query: string): string {
  return `${FONT_CSS_PATH}?${query}`;
}

/** Only family names, axes and the display switch may pass through (no other parameters, no other hosts). */
export function isSafeFontQuery(query: string): boolean {
  return query.length > 0 && query.length <= 600 && /^[A-Za-z0-9+%:@;,.&=_-]+$/.test(query) && query.includes("family=");
}

/** Font file URLs inside Google's CSS → our file route. */
export function rewriteFontCss(css: string): string {
  return css.replaceAll(GSTATIC, FONT_FILE_PATH);
}

/** A gstatic path we are willing to fetch (fonts only, no traversal). */
export function isSafeFontFile(path: string): boolean {
  return /^[A-Za-z0-9/_.-]+\.(woff2?|ttf|otf)$/.test(path) && !path.includes("..");
}
