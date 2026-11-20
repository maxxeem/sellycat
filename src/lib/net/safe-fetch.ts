import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetching pages and images that customers point us to (branding import, AI deal import) without
 * letting them reach our own network (SSRF): http(s) only, standard ports, every hop's address
 * must be public, size and time limits, at most five redirects.
 */
/** The first request plus up to five redirects (shops often chain domain → www → language → page). */
const MAX_HOPS = 6;
const USER_AGENT = "Mozilla/5.0 (compatible; SellycatBot/1.0; +https://sellycat.com)";
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

export async function assertPublic(url: URL) {
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

export async function fetchText(start: string, accept: string, maxBytes = MAX_BYTES, timeoutMs = TIMEOUT_MS): Promise<{ url: URL; text: string } | null> {
  let url = new URL(start);
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { accept, "user-agent": USER_AGENT } });
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
      if (size > maxBytes) {
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


/** An image (only image/* responses, at most `maxBytes`), with the same guards. */
export async function fetchImage(start: string, maxBytes = 10_000_000, timeoutMs = TIMEOUT_MS): Promise<{ data: Buffer; type: string } | null> {
  let url: URL;
  try {
    url = new URL(start);
  } catch {
    return null;
  }
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    try {
      await assertPublic(url);
    } catch {
      return null;
    }
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { accept: "image/*", "user-agent": USER_AGENT } }).catch(() => null);
    if (!res) return null;
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!res.ok || !res.body || !type.startsWith("image/")) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return { data: Buffer.concat(chunks), type };
  }
  return null;
}

/**
 * POST to a customer's endpoint (webhooks) with the same address checks; redirects are not
 * followed (they count as failure), the answer is read up to 2 KB for the delivery log.
 */
export async function postPublic(target: string, body: string, headers: Record<string, string>, timeoutMs = 10_000): Promise<{ status: number; text: string }> {
  const url = new URL(target);
  if (url.protocol !== "https:") throw new Error("protocol");
  await assertPublic(url);
  const res = await fetch(url, { method: "POST", body, redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": USER_AGENT, "content-type": "application/json", ...headers } });
  let text = "";
  if (res.body) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 2048) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    text = new TextDecoder().decode(Buffer.concat(chunks)).slice(0, 2048);
  }
  return { status: res.status, text };
}
