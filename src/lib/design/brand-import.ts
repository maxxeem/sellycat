import "server-only";
import { normaliseHex } from "./color";
import { extractBranding, type BrandingSuggestion } from "./brand-parse";
import { BlockedError, fetchText } from "@/lib/net/safe-fetch";

/**
 * "Branding von Website übernehmen": fetches a customer's website on the server and suggests
 * logo, colours and fonts. Fetching goes through the SSRF-safe helper (src/lib/net/safe-fetch.ts).
 */
export { BlockedError };

export type ImportResult = { ok: true; suggestion: BrandingSuggestion } | { ok: false; reason: "blocked" | "unreachable" | "nothing" };

/** Stylesheets of UI libraries carry their own colours, never the brand's. */
const LIBRARY_SHEET = /vendor|swiper|slick|owl\.|fontawesome|font-awesome|normalize|reset\.|animate|aos\.|leaflet|mapbox|cookie|typekit|fonts\.googleapis/i;

export async function importBranding(input: string): Promise<ImportResult> {
  const start = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  let page: { url: URL; text: string } | null;
  try {
    page = await fetchText(start, "text/html");
  } catch (e) {
    return { ok: false, reason: e instanceof BlockedError ? "blocked" : "unreachable" };
  }
  if (!page) return { ok: false, reason: "unreachable" };
  // Up to five stylesheets (libraries skipped) add colours and fonts the HTML does not mention.
  const sheets = [...page.text.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter((h): h is string => Boolean(h) && !LIBRARY_SHEET.test(h!))
    .slice(0, 5);
  let css = "";
  for (const href of sheets) {
    if (css.length > 900_000) break;
    const sheet = await fetchText(new URL(href, page.url).toString(), "text/css").catch(() => null);
    if (sheet) css += `\n${sheet.text.slice(0, 400_000)}`;
  }
  // The web manifest names the app's theme and background colours.
  let manifest: { theme_color?: string; background_color?: string } | null = null;
  const manifestHref = page.text.match(/<link[^>]+rel=["']?manifest["']?[^>]*>/i)?.[0].match(/href=["']([^"']+)["']/i)?.[1];
  if (manifestHref) {
    const m = await fetchText(new URL(manifestHref, page.url).toString(), "application/manifest+json, application/json").catch(() => null);
    try {
      manifest = m ? JSON.parse(m.text) : null;
    } catch {
      manifest = null;
    }
  }
  const suggestion = extractBranding(page.text, css, page.url.toString(), manifest);
  if (suggestion.colors.primary) suggestion.colors.primary = normaliseHex(suggestion.colors.primary) ?? undefined;
  const useful = suggestion.logo || suggestion.colors.primary || suggestion.fonts.heading || suggestion.favicon;
  return useful ? { ok: true, suggestion } : { ok: false, reason: "nothing" };
}
