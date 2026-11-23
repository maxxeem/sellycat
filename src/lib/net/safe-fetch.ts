import "server-only";
import { lookup } from "node:dns/promises";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { Readable } from "node:stream";
import zlib from "node:zlib";

/**
 * Fetching pages and images that customers point us to (branding import, AI deal import) and
 * webhook deliveries without letting them reach our own network (SSRF): http(s) only, standard
 * ports, every hop's address must be public, size and time limits, at most five redirects. The
 * address is checked again at connect time (`pinnedFetch`), so a name that changes its answer
 * between check and request (DNS rebinding) cannot slip through.
 */
/** The first request plus up to five redirects (shops often chain domain → www → language → page). */
const MAX_HOPS = 6;
const USER_AGENT = "Mozilla/5.0 (compatible; SellycatBot/1.0; +https://sellycat.com)";
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

function privateV4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

/** Eight 16-bit groups of an IPv6 address (an embedded IPv4 tail expanded). */
function ipv6Groups(ip: string): number[] | null {
  let v = ip.toLowerCase().split("%")[0];
  const tail = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const [a, b, c, d] = tail[1].split(".").map(Number);
    v = v.slice(0, -tail[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [left, right] = v.split("::");
  const l = left ? left.split(":") : [];
  const r = right ? right.split(":") : [];
  const fill = v.includes("::") ? 8 - l.length - r.length : 0;
  const groups = [...l, ...Array<string>(Math.max(0, fill)).fill("0"), ...r].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

const v4From = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

/** Not a public unicast address (also IPv4 hidden in IPv6: mapped, compatible, NAT64, 6to4). */
export function privateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return privateV4(ip);
  if (isIP(ip) !== 6) return true;
  const g = ipv6Groups(ip);
  if (!g) return true;
  // ::ffff:a.b.c.d (mapped), ::a.b.c.d (compatible), :: and ::1.
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return g[5] === 0 && g[6] === 0 ? true : privateV4(v4From(g[6], g[7]));
  if (g[0] === 0x64 && g[1] === 0xff9b) return privateV4(v4From(g[6], g[7])); // NAT64
  if (g[0] === 0x2002) return privateV4(v4From(g[1], g[2])); // 6to4
  // Beyond that only global unicast (2000::/3), without Teredo and the documentation range.
  if (g[0] < 0x2000 || g[0] > 0x3fff) return true;
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0xdb8)) return true;
  return false;
}

/** DNS lookup for outgoing connections that refuses non-public answers (checked at connect time). */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as unknown as dns.LookupAddress[];
    if (!list.length || list.some((a) => privateAddress(a.address))) return callback(Object.assign(new Error("private address"), { code: "EPRIVATE" }), "", 4);
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

/**
 * `fetch`-like request over node:http(s) with the guarded lookup: no redirects followed, gzip/
 * deflate/brotli decoded, aborted after `timeoutMs`. IP literals need no lookup; `assertPublic`
 * covers them.
 */
export async function pinnedFetch(url: URL, init: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs: number; signal?: AbortSignal }): Promise<Response> {
  const mod = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(
      url,
      { method: init.method ?? "GET", headers: { "accept-encoding": "gzip, deflate, br", ...init.headers }, lookup: guardedLookup, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(init.timeoutMs)]) : AbortSignal.timeout(init.timeoutMs) },
      (res) => {
        const headers = new Headers();
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
        const status = res.statusCode ?? 502;
        const enc = (headers.get("content-encoding") ?? "").toLowerCase();
        const decoded = enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
        const noBody = status < 200 || status > 599 || [204, 205, 304].includes(status) || init.method === "HEAD";
        if (noBody) res.resume();
        headers.delete("content-encoding");
        headers.delete("content-length");
        resolve(new Response(noBody ? null : (Readable.toWeb(decoded) as ReadableStream), { status: status < 200 || status > 599 ? 502 : status, headers }));
      },
    );
    req.on("error", reject);
    if (init.body) req.write(init.body);
    req.end();
  });
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

/**
 * Sites disagree about who may read them: some stall or reset requests that name a bot (shops
 * behind Akamai and similar), others block a browser name whose connection does not look like a
 * browser (Cloudflare). Pages are therefore requested as both at once and the first good answer
 * wins; the other request is cancelled. The host's winner is remembered for its images.
 */
const IDENTITIES = {
  bot: { "user-agent": USER_AGENT },
  browser: {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "accept-language": "de-CH,de;q=0.9,en;q=0.8",
  },
} as const;
type Identity = keyof typeof IDENTITIES;
const preferred = new Map<string, { id: Identity; at: number }>();
const remember = (host: string, id: Identity) => {
  if (preferred.size > 500) preferred.clear();
  preferred.set(host, { id, at: Date.now() });
};
const preferredFor = (host: string): Identity | undefined => {
  const p = preferred.get(host);
  return p && Date.now() - p.at < 10 * 60_000 ? p.id : undefined;
};

type Hop = { url: URL; res: Response };

/** Follows redirects (each hop checked) as one identity; null for an unusable address. */
async function follow(start: URL, accept: string, id: Identity, timeoutMs: number, signal?: AbortSignal): Promise<Hop | null> {
  let url = start;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    await assertPublic(url);
    const res = await pinnedFetch(url, { timeoutMs, signal, headers: { accept, ...IDENTITIES[id] } });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      url = new URL(location, url);
      continue;
    }
    return { url, res };
  }
  return null;
}

async function readCapped(res: Response, maxBytes: number, overflow: "truncate" | "fail"): Promise<Buffer | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      if (overflow === "fail") return null;
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Charset from the header or the page's own meta tag (UTF-8 if unknown or unsupported). */
function decodeText(data: Buffer, contentType: string | null): string {
  const declared = contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ?? data.subarray(0, 2048).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  try {
    return new TextDecoder(declared && !/^utf-?8$/i.test(declared) ? declared : "utf-8").decode(data);
  } catch {
    return new TextDecoder().decode(data);
  }
}

type TextResult = { url: URL; text: string };

/** One identity's attempt: the text, or why there is none ("blocked" or "failed"). */
async function textAs(start: URL, accept: string, id: Identity, maxBytes: number, timeoutMs: number, signal: AbortSignal): Promise<TextResult | "blocked" | "failed"> {
  try {
    const hop = await follow(start, accept, id, timeoutMs, signal);
    if (!hop) return "failed";
    const { res, url } = hop;
    if ([401, 403, 429, 503].includes(res.status) && (res.headers.get("server")?.toLowerCase().includes("cloudflare") || res.headers.has("cf-mitigated") || res.status === 403)) {
      await res.body?.cancel().catch(() => {});
      return "blocked";
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return "failed";
    }
    const data = await readCapped(res, maxBytes, "truncate");
    if (!data) return "failed";
    const text = decodeText(data, res.headers.get("content-type"));
    if (accept.includes("html") && BLOCK_PAGE.test(text.slice(0, 20_000))) return "blocked";
    return { url, text };
  } catch (e) {
    if (e instanceof Error && /protocol|port|credentials|private address/.test(e.message)) throw e;
    return "failed";
  }
}

/**
 * A page or text file. Throws `BlockedError` when every identity was turned away by bot
 * protection, returns null when the site could not be read, throws on addresses we never fetch.
 */
export async function fetchText(start: string, accept: string, maxBytes = MAX_BYTES, timeoutMs = TIMEOUT_MS): Promise<TextResult | null> {
  const url = new URL(start);
  await assertPublic(url);
  const known = preferredFor(url.hostname);
  const ids: Identity[] = known ? [known] : ["bot", "browser"];
  const controllers = ids.map(() => new AbortController());
  const outcomes: Array<"blocked" | "failed"> = [];
  const result = await new Promise<TextResult | null>((resolve, reject) => {
    let open = ids.length;
    ids.forEach((id, i) => {
      textAs(url, accept, id, maxBytes, timeoutMs, controllers[i].signal).then(
        (r) => {
          open--;
          if (typeof r === "object") {
            remember(url.hostname, id);
            remember(r.url.hostname, id);
            controllers.forEach((c, j) => j !== i && c.abort());
            resolve(r);
          } else {
            outcomes.push(r);
            if (!open) resolve(null);
          }
        },
        (e) => {
          controllers.forEach((c) => c.abort());
          reject(e);
        },
      );
    });
  });
  if (result) return result;
  // The remembered identity stopped working: forget it and try both once more.
  if (known) {
    preferred.delete(url.hostname);
    return fetchText(start, accept, maxBytes, timeoutMs);
  }
  if (outcomes.includes("blocked")) throw new BlockedError("blocked");
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
  // Images go out as the identity that worked for their host, else as a browser (image CDNs
  // rarely block browsers), then once more as the bot.
  const known = preferredFor(url.hostname);
  const ids: Identity[] = known ? [known, known === "bot" ? "browser" : "bot"] : ["browser", "bot"];
  for (const id of ids) {
    try {
      const hop = await follow(url, "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8", id, timeoutMs);
      if (!hop) return null;
      const type = hop.res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      if (!hop.res.ok || !type.startsWith("image/")) {
        await hop.res.body?.cancel().catch(() => {});
        if (hop.res.status === 404 || hop.res.status === 410 || (hop.res.ok && !type.startsWith("image/"))) return null;
        continue;
      }
      const data = await readCapped(hop.res, maxBytes, "fail");
      if (!data) return null;
      remember(url.hostname, id);
      return { data, type };
    } catch (e) {
      if (e instanceof Error && /protocol|port|credentials|private address/.test(e.message)) return null;
    }
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
  const res = await pinnedFetch(url, { method: "POST", body, timeoutMs, headers: { "user-agent": USER_AGENT, "content-type": "application/json", ...headers } });
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
