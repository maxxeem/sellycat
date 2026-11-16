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

async function fetchText(start: string, accept: string): Promise<{ url: URL; text: string } | null> {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept, "user-agent": "Mozilla/5.0 (compatible; SellycatBrandingBot/1.0)" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
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
    return { url, text: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  return null;
}

export async function importBranding(input: string): Promise<BrandingSuggestion | null> {
  const start = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  const page = await fetchText(start, "text/html").catch(() => null);
  if (!page) return null;
  // Up to two same-site stylesheets add colours and fonts the HTML does not mention.
  const sheets = [...page.text.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter((h): h is string => Boolean(h) && !/fonts\.googleapis/.test(h!))
    .slice(0, 2);
  let css = "";
  for (const href of sheets) {
    const sheet = await fetchText(new URL(href, page.url).toString(), "text/css").catch(() => null);
    if (sheet) css += `\n${sheet.text.slice(0, 400_000)}`;
  }
  const suggestion = extractBranding(page.text, css, page.url.toString());
  if (suggestion.colors.primary) suggestion.colors.primary = normaliseHex(suggestion.colors.primary) ?? undefined;
  return suggestion;
}
