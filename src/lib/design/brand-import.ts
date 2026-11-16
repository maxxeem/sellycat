import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { normaliseHex } from "./color";
import { extractBranding, type BrandingSuggestion } from "./brand-parse";

/**
 * "Branding von Website übernehmen": fetches a customer's website on the server and suggests
 * logo, colours and fonts. Guards against SSRF: http(s) only, standard ports, every hop's address
 * must be public, small size and time limits, at most three redirects.
 */
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("port");
  if (url.username || url.password) throw new Error("credentials");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => privateAddress(a.address))) throw new Error("private address");
}

/** Bot protection (Cloudflare and similar) answered instead of the site. We respect it and say so. */
export class BlockedError extends Error {}
const BLOCK_PAGE = /Attention Required! \| Cloudflare|cf-chl-|challenge-platform|Just a moment\.\.\.|captcha-delivery|px-captcha/i;

async function fetchText(start: string, accept: string): Promise<{ url: URL; text: string } | null> {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept, "user-agent": "Mozilla/5.0 (compatible; SellycatBrandingBot/1.0)" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if ([401, 403, 429, 503].includes(res.status) && (res.headers.get("server")?.toLowerCase().includes("cloudflare") || res.headers.has("cf-mitigated") || res.status === 403)) throw new BlockedError(String(res.status));
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    if (accept.includes("html") && BLOCK_PAGE.test(text.slice(0, 20_000))) throw new BlockedError("challenge page");
    return { url, text };
  }
  return null;
}

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
