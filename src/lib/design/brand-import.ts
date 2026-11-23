import "server-only";
import sharp from "sharp";
import { normaliseHex } from "./color";
import { extractBranding, paletteFromPixels, type BrandingSuggestion, type ImagePalette, type Manifest } from "./brand-parse";
import { BlockedError, fetchImage, fetchText } from "@/lib/net/safe-fetch";

/**
 * "Branding von Website übernehmen": fetches a customer's website on the server and suggests
 * logo, colours and fonts. Fetching goes through the SSRF-safe helper (src/lib/net/safe-fetch.ts).
 *
 * Many sites give little away to a server: bot protection answers instead of the page, or the
 * page is an empty JavaScript shell that loads its logo later. So the suggestion is built in
 * layers: page markup and stylesheets, then the logo and icon pictures themselves (their colours
 * are the brand's colours), and when the site cannot be read at all, the site icon Google has
 * on file for the domain. Logo and icon are copied into the shop's storage by the caller, so the
 * shop does not depend on (signed, expiring or blocked) addresses of the customer's site.
 */
export { BlockedError };

export type BrandFile = { data: Buffer; type: "image/png" | "image/svg+xml"; ext: "png" | "svg" };
export type ImportResult = { ok: true; suggestion: BrandingSuggestion; partial: boolean } | { ok: false; reason: "blocked" | "unreachable" | "nothing" };
export type ImportWithFiles = { ok: true; suggestion: BrandingSuggestion; partial: boolean; files: { logo?: BrandFile; favicon?: BrandFile } } | { ok: false; reason: "blocked" | "unreachable" | "nothing" };

/** Stylesheets of UI libraries carry their own colours, never the brand's. */
const LIBRARY_SHEET = /vendor|swiper|slick|owl\.|fontawesome|font-awesome|normalize|reset\.|animate|aos\.|leaflet|mapbox|cookie|typekit|fonts\.googleapis/i;
const IMAGE_TIMEOUT_MS = 8000;

/** The icon Google keeps for a domain (its own copy, so it works when the site blocks us). */
const googleIcon = (origin: string) => `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=256`;

/** An SVG we can serve as is: no scripts, event handlers, foreign content or outside references. */
function safeSvg(text: string): boolean {
  return /<svg\b/i.test(text) && !/<script|<foreignObject|\son\w+\s*=|javascript:|<iframe|<!ENTITY|(?:xlink:)?href=["'](?!#|data:image\/)/i.test(text);
}

type Picture = { file: BrandFile; png: Buffer; width: number; height: number };

/** A fetched or inline picture → PNG (or the clean SVG itself), with its size. */
async function toPicture(data: Buffer, type: string, box: { width: number; height: number }): Promise<Picture | null> {
  try {
    const svg = type.includes("svg") || /^\s*(<\?xml[^>]*>\s*)?<svg\b/i.test(data.subarray(0, 300).toString("utf8"));
    const input = sharp(data, { density: svg ? 300 : undefined, limitInputPixels: 40_000_000, animated: false });
    const meta = await input.metadata();
    if (!meta.width || !meta.height) return null;
    const png = await input.rotate().resize({ ...box, fit: "inside", withoutEnlargement: !svg }).png({ compressionLevel: 9 }).toBuffer();
    const size = await sharp(png).metadata();
    const file: BrandFile = svg && safeSvg(data.toString("utf8")) ? { data, type: "image/svg+xml", ext: "svg" } : { data: png, type: "image/png", ext: "png" };
    return { file, png, width: size.width ?? 0, height: size.height ?? 0 };
  } catch {
    return null;
  }
}

async function loadPicture(url: string, box: { width: number; height: number }, min: number): Promise<Picture | null> {
  const img = await fetchImage(url, 5_000_000, IMAGE_TIMEOUT_MS).catch(() => null);
  if (!img) return null;
  const pic = await toPicture(img.data, img.type, box);
  return pic && Math.max(pic.width, pic.height) >= min ? pic : null;
}

async function palette(png: Buffer): Promise<ImagePalette | null> {
  try {
    const { data, info } = await sharp(png).resize({ width: 64, height: 64, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return paletteFromPixels(data, info.width, info.height, info.channels);
  } catch {
    return null;
  }
}

const saturation = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b);
  return max ? (max - Math.min(r, g, b)) / max : 0;
};

function mergePalettes(main: ImagePalette | null, extra: ImagePalette | null): ImagePalette | null {
  if (!main) return extra;
  const all = [...new Set([...main.vivid, ...(extra?.vivid ?? [])])];
  return { ...main, vivid: [...all.filter((h) => saturation(h) >= 0.45), ...all.filter((h) => saturation(h) < 0.45)] };
}

export async function importBranding(input: string): Promise<ImportWithFiles> {
  const start = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  let origin: string;
  try {
    origin = new URL(start).origin;
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  let page: { url: URL; text: string } | null = null;
  let blocked = false;
  try {
    page = await fetchText(start, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", 2_500_000, 12_000);
  } catch (e) {
    if (e instanceof BlockedError) blocked = true;
    else if (e instanceof Error && /protocol|port|credentials|private address/.test(e.message)) return { ok: false, reason: "unreachable" };
  }
  const base = page?.url.toString() ?? `${origin}/`;
  const html = page?.text ?? "";

  // Up to five stylesheets add colours and fonts the HTML does not mention; first-party sheets
  // first, library sheets only when the site has nothing else (their library colours are
  // filtered out when parsing).
  let css = "";
  let manifest: Manifest | null = null;
  if (page) {
    const hrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)].map((m) => m[0].match(/href=["']?([^"'\s>]+)/i)?.[1]).filter((h): h is string => Boolean(h));
    const own = hrefs.filter((h) => !LIBRARY_SHEET.test(h));
    const sheets = (own.length ? own : hrefs).slice(0, 5);
    const loaded = await Promise.all(sheets.map((href) => fetchText(new URL(href, page!.url).toString(), "text/css,*/*;q=0.1", 900_000).catch(() => null)));
    css = loaded.map((s) => s?.text.slice(0, 400_000) ?? "").join("\n");
    // The web manifest names the app's theme and background colours and its icons.
    const manifestHref = html.match(/<link[^>]+rel=["']?manifest["']?[^>]*>/i)?.[0].match(/href=["']?([^"'\s>]+)/i)?.[1];
    if (manifestHref) {
      const manifestUrl = new URL(manifestHref, page.url);
      const m = await fetchText(manifestUrl.toString(), "application/manifest+json, application/json").catch(() => null);
      try {
        const parsed = m ? (JSON.parse(m.text) as Manifest) : null;
        manifest = parsed ? { ...parsed, icons: parsed.icons?.map((i) => ({ ...i, src: i.src ? new URL(i.src, manifestUrl).toString() : undefined })) } : null;
      } catch {
        manifest = null;
      }
    }
  }

  const first = extractBranding(html, css, base, manifest);

  // The logo picture: what the page calls its logo, else an inline SVG logo.
  let logo: Picture | null = null;
  for (const u of [first.logo, ...(first.logoCandidates ?? [])].filter((x): x is string => Boolean(x)).slice(0, 4)) {
    logo = await loadPicture(u, { width: 1200, height: 400 }, 24);
    if (logo) break;
  }
  if (!logo && first.logoSvg) logo = await toPicture(Buffer.from(first.logoSvg), "image/svg+xml", { width: 1200, height: 400 });

  // The icon: the page's, the usual address, then Google's copy (also when the site blocks us).
  const iconUrls = [...(first.icons ?? []).slice(0, 3), ...(page ? [`${origin}/apple-touch-icon.png`] : []), googleIcon(origin)];
  let icon: Picture | null = null;
  for (const u of iconUrls) {
    icon = await loadPicture(u, { width: 256, height: 256 }, 48);
    if (icon) break;
  }

  // A site without a findable logo: its icon is the best logo we have (often the same mark).
  const logoFromIcon = !logo && Boolean(icon);
  // Colours of the logo, then of the icon; strong colours first (a pale wordmark on a hero
  // picture says less than a saturated icon).
  const [fromLogo, fromIcon] = await Promise.all([logo ? palette(logo.png) : null, icon ? palette(icon.png) : null]);
  const colours = mergePalettes(fromLogo ?? fromIcon, logo ? fromIcon : null);
  const suggestion = extractBranding(html, css, base, manifest, colours);
  if (suggestion.colors.primary) suggestion.colors.primary = normaliseHex(suggestion.colors.primary) ?? undefined;
  delete suggestion.logoCandidates;
  delete suggestion.logoSvg;
  delete suggestion.icons;
  const files: { logo?: BrandFile; favicon?: BrandFile } = {};
  if (logo ?? icon) files.logo = (logo ?? icon)!.file;
  if (icon) files.favicon = icon.file;
  suggestion.logo = files.logo ? "pending:logo" : undefined;
  suggestion.favicon = files.favicon ? "pending:favicon" : undefined;

  const useful = suggestion.logo || suggestion.colors.primary || suggestion.fonts.heading || suggestion.favicon;
  if (!useful) return { ok: false, reason: blocked ? "blocked" : page ? "nothing" : "unreachable" };
  return { ok: true, suggestion, partial: !page || logoFromIcon, files };
}

/**
 * Colours from a logo the customer uploaded (works for every site, also those that block us):
 * brand colour, accent and, for a logo on a dark plate, a dark page.
 */
export async function brandingFromLogo(logoUrl: string): Promise<BrandingSuggestion | null> {
  const pic = await loadPicture(logoUrl, { width: 1200, height: 400 }, 16);
  if (!pic) return null;
  const colours = await palette(pic.png);
  if (!colours) return null;
  const s = extractBranding("", "", logoUrl, null, colours);
  delete s.logoCandidates;
  delete s.logoSvg;
  delete s.icons;
  delete s.favicon;
  delete s.logo;
  return s.colors.primary ? s : null;
}
