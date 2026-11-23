/**
 * Pure part of the branding import (unit-tested): reads logo, icon, colours and fonts out of a
 * page's HTML and CSS. Everything is a suggestion; nothing is applied automatically.
 */
import { contrastRatio, hexToRgb, luminance, mix, normaliseHex, rgbToHex } from "./color";

export type BrandingSuggestion = {
  logo?: string;
  /** Further logo pictures to try when `logo` cannot be loaded (JSON-LD, header images, icons). */
  logoCandidates?: string[];
  /** An inline <svg> logo (no image file on the page); rasterised on the server. */
  logoSvg?: string;
  /** Site icons, best first (apple-touch-icon, manifest, large favicons). */
  icons?: string[];
  favicon?: string;
  socialImage?: string;
  colors: { primary?: string; accent?: string; text?: string; background?: string; surface?: string };
  /** Dark when the site's page background is dark. */
  mode?: "light" | "dark";
  fonts: { heading?: string; body?: string };
  googleFonts: string[];
};

const abs = (href: string | undefined, base: string) => {
  if (!href) return undefined;
  try {
    const u = new URL(href.trim().replace(/&amp;/g, "&").replace(/&#0?38;/g, "&"), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];

const colourDistance = (a: string, b: string) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
};

/** Strong enough to carry a brand: not grey, not a pastel close to white. */
function brandish(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  return max - Math.min(r, g, b) >= 40 && luminance(hex) < 0.8;
}

function isGrey(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

/** Custom properties of UI libraries (sliders, icon sets, CSS frameworks, CMS presets). */
const LIBRARY_VARS = /--(?:swiper|bs-|wp--|tw-|fa-|plyr|toastify|mdc-|mat-|chakra|mantine|splide|glide|slick|owl|aos)[\w-]*\s*:[^;}]*/gi;
const BRAND_NAME = /primary|brand|accent|main|theme|highlight|cta|corporate/i;
const NOT_BRAND = /text|font|bg|background|border|shadow|sub|muted|grey|gray|disabled|placeholder|overlay|premium|error|danger|success|warning/i;
const brandRank = (name: string) => (/brand|corporate/i.test(name) ? 0 : /primary/i.test(name) ? 1 : /accent|highlight|cta/i.test(name) ? 2 : 3);

export type Manifest = { theme_color?: string; background_color?: string; icons?: Array<{ src?: string; sizes?: string; purpose?: string }> };

/** Colours found in the logo or icon picture (see `paletteFromPixels`). */
export type ImagePalette = { vivid: string[]; background?: string; dark?: string; ink?: string };

/** Organization/Brand logo from JSON-LD. */
function ldLogo(html: string, base: string): string | undefined {
  for (const m of html.matchAll(/<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const found: string[] = [];
      const visit = (v: unknown, depth: number) => {
        if (!v || typeof v !== "object" || depth > 4) return;
        if (Array.isArray(v)) return v.forEach((x) => visit(x, depth + 1));
        const n = v as Record<string, unknown>;
        const logo = n.logo as unknown;
        const src = typeof logo === "string" ? logo : typeof (logo as Record<string, unknown>)?.url === "string" ? ((logo as Record<string, unknown>).url as string) : undefined;
        if (src) found.push(src);
        for (const key of ["@graph", "publisher", "brand", "author", "provider", "isPartOf"]) visit(n[key], depth + 1);
      };
      visit(JSON.parse(m[1].trim()), 0);
      const u = found.map((f) => abs(f, base)).find(Boolean);
      if (u) return u;
    } catch {
      // Broken JSON-LD is common.
    }
  }
  return undefined;
}

const imgSrc = (tag: string) => {
  const srcset = attr(tag, "srcset") ?? attr(tag, "data-srcset");
  const best = srcset?.split(/,\s+/).map((x) => x.trim().split(/\s+/)[0]).pop();
  return attr(tag, "src") && !/^data:/i.test(attr(tag, "src")!) ? attr(tag, "src") : (attr(tag, "data-src") ?? best ?? attr(tag, "src"));
};

type LogoCandidate = { src?: string; svg?: string; score: number };

/**
 * Pictures and inline SVGs that may be the site's own logo, scored: inside the header or the
 * link to the home page, named after the site, SVG; partner and customer logos further down
 * the page (logo walls) and pictures with a long description lose.
 */
function logoCandidates(html: string, baseUrl: string): LogoCandidate[] {
  let host = "";
  try {
    host = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    // keep empty
  }
  const brand = host.split(".").slice(-2, -1)[0] ?? "";
  const headerEnd = (() => {
    const h = html.search(/<\/header>/i);
    const m = html.search(/<main\b|<h1\b/i);
    return h > 0 ? h : m > 0 ? m : Math.min(html.length, 20_000);
  })();
  const out: LogoCandidate[] = [];
  const context = (index: number) => html.slice(Math.max(0, index - 300), index);
  const homeLink = (before: string) => {
    const a = before.match(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*$/i)?.[0];
    const href = a ? attr(a, "href") : undefined;
    if (!href) return false;
    try {
      const u = new URL(href, baseUrl);
      return u.hostname.replace(/^www\./, "") === host && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/?)?$/i.test(u.pathname);
    } catch {
      return false;
    }
  };
  const score = (index: number, own: string, wrapperNamed: boolean, before: string) => {
    let sc = 0;
    if (/logo/i.test(own)) sc += 2;
    if (wrapperNamed) sc += 2;
    if (index < headerEnd) sc += 3;
    if (homeLink(before)) sc += 3;
    if (brand.length > 2 && own.toLowerCase().includes(brand.toLowerCase())) sc += 2;
    sc -= (index / Math.max(1, html.length)) * 3;
    return sc;
  };
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const t = m[0];
    const index = m.index ?? 0;
    const before = context(index);
    const own = `${imgSrc(t)} ${attr(t, "alt")} ${attr(t, "class")} ${attr(t, "id")}`;
    const wrapperNamed = /<(a|div|span|figure|picture)\b[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*>\s*(?:<(?:picture|source)[^>]*>\s*)*$/i.test(before);
    if (!/logo/i.test(own) && !wrapperNamed && index > headerEnd) continue;
    if ((attr(t, "alt") ?? "").length > 60) continue;
    if (/logos?[-_ ]?(wall|grid|cloud|carousel|strip)|partner|customer|client|kunden|sponsor|award|badge|payment|zahlung/i.test(`${own} ${before.slice(-200)}`)) continue;
    let sc = score(index, own, wrapperNamed, before);
    if (/\.svg/i.test(imgSrc(t) ?? "")) sc += 1;
    if (!/logo/i.test(own) && !wrapperNamed) sc -= 3; // just the first picture in the header
    out.push({ src: abs(imgSrc(t), baseUrl), score: sc });
  }
  for (const m of html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi)) {
    const svg = m[0];
    const index = m.index ?? 0;
    if (svg.length < 200 || svg.length > 200_000 || /<use\b[^>]*href=["']#/i.test(svg)) continue;
    const open = svg.match(/<svg\b[^>]*>/i)![0];
    const before = context(index);
    const wrapper = before.match(/<(a|div|span|figure)\b[^>]*>\s*(?:<[^>]+>\s*)*$/i)?.[0] ?? "";
    const own = `${attr(open, "class")} ${attr(open, "id")} ${attr(open, "aria-label")} ${svg.match(/<title>([^<]*)/i)?.[1] ?? ""}`;
    const wrapperNamed = /class=["'][^"']*logo|id=["'][^"']*logo|aria-label=["'][^"']*(logo|home|startseite)/i.test(wrapper);
    if (!/logo/i.test(own) && !wrapperNamed && !(index < headerEnd && homeLink(before))) continue;
    out.push({ svg, score: score(index, own, wrapperNamed, before) + 1 });
  }
  return out.filter((c) => c.src || c.svg).sort((x, y) => y.score - x.score);
}

const sizeOf = (sizes?: string) => Math.max(0, ...(sizes ?? "").split(/\s+/).map((x) => Number(x.split("x")[0]) || 0));

export function extractBranding(html: string, css: string, baseUrl: string, manifest?: Manifest | null, logoPalette?: ImagePalette | null): BrandingSuggestion {
  const tags = (re: RegExp) => [...html.matchAll(re)].map((m) => m[0]);
  const links = tags(/<link\b[^>]*>/gi);
  const metas = tags(/<meta\b[^>]*>/gi);

  // Logo: the best scored picture or inline SVG (see `logoCandidates`), the JSON-LD logo as a
  // fallback right after the pictures that look like the site's own.
  const scored = logoCandidates(html, baseUrl);
  const best = scored[0];
  const ld = ldLogo(html, baseUrl);
  const pictures = scored.filter((c) => c.src).map((c) => c.src!);
  const logoSvg = best?.svg && (!pictures.length || best.score > (scored.find((c) => c.src)?.score ?? -99)) ? best.svg : undefined;
  const strong = scored.filter((c) => c.src && c.score >= 3).map((c) => c.src!);
  const logoUrls = logoSvg ? [] : [...new Set([...strong, ...(ld ? [ld] : []), ...pictures])];

  // Icons, best first: apple-touch-icon, the manifest's largest, large PNG/SVG favicons, any favicon.
  const iconLinks = links.filter((t) => /rel=["']?[^"'>]*icon/i.test(t) && !/mask-icon/i.test(t));
  const touch = iconLinks.filter((t) => /apple-touch-icon/i.test(t));
  const manifestIcons = [...(manifest?.icons ?? [])].filter((i) => i.src && !/monochrome/i.test(i.purpose ?? "")).sort((a, b) => sizeOf(b.sizes) - sizeOf(a.sizes)).map((i) => i.src);
  const vector = iconLinks.filter((t) => !touch.includes(t) && /\.(png|svg)/i.test(attr(t, "href") ?? "")).sort((a, b) => sizeOf(attr(b, "sizes")) - sizeOf(attr(a, "sizes")));
  const icons = [...new Set([...touch.map((t) => attr(t, "href")), ...manifestIcons, ...vector.map((t) => attr(t, "href")), ...iconLinks.map((t) => attr(t, "href"))].map((h) => abs(h, baseUrl)).filter((u): u is string => Boolean(u)))];
  const ogImage = metas.find((t) => /property=["']og:image["']/i.test(t));
  const themeColor = metas.find((t) => /name=["']theme-color["']/i.test(t));

  // Colours, in order of how reliably they describe the brand:
  // 1. <meta name="theme-color"> and the web manifest's theme_color,
  // 2. CSS variables named like a brand colour (--primary, --brand-color, --typographyPrimary …),
  // 3. the most used non-grey colours. Variables and colours of UI libraries are ignored.
  const all = `${html.match(/<style[\s\S]*?<\/style>/gi)?.join("\n") ?? ""}\n${tags(/style=["'][^"']*["']/gi).join("\n")}\n${css}`;
  const cleaned = all.replace(LIBRARY_VARS, "");
  const toHex = (raw: string | undefined): string | undefined => {
    if (!raw) return undefined;
    const v = raw.trim();
    const hex = normaliseHex(v.match(/#[0-9a-f]{3,8}\b/i)?.[0]);
    if (hex) return hex.slice(0, 7);
    const rgb = v.match(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
    return rgb ? rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])).toLowerCase() : undefined;
  };

  const counts = new Map<string, number>();
  for (const m of cleaned.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const hex = normaliseHex(m[0]);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  for (const m of cleaned.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) {
    const hex = rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])).toLowerCase();
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  const vivid = ranked.filter(brandish);

  // Brand variables: name says primary/brand/accent…, value is a non-grey colour.
  const brandVars = [...cleaned.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)]
    .map((m) => ({ name: m[1], hex: toHex(m[2]) }))
    .filter((v): v is { name: string; hex: string } => Boolean(v.hex) && brandish(v.hex!) && BRAND_NAME.test(v.name) && !NOT_BRAND.test(v.name))
    .sort((a, b) => brandRank(a.name) - brandRank(b.name));

  const manifestTheme = normaliseHex(manifest?.theme_color) ?? undefined;
  const metaTheme = normaliseHex(attr(themeColor ?? "", "content")) ?? undefined;
  // The logo's own colour beats CSS variables: bundled UI kits name their colours "primary" too.
  const pick = [metaTheme, manifestTheme].find((h) => h && brandish(h));
  const logoVivid = logoPalette?.vivid ?? [];
  // A black-and-white brand: its logo's ink is the primary colour.
  const primary = pick ?? logoVivid[0] ?? brandVars[0]?.hex ?? vivid[0] ?? logoPalette?.ink;
  const accent = [...logoVivid, ...brandVars.map((v) => v.hex), ...vivid].find((h) => h !== primary && colourDistance(h, primary ?? "#000000") > 30);

  // Page background and text: the body/html rule, else the manifest's background colour.
  const pageRule = (prop: RegExp) => {
    for (const m of cleaned.matchAll(/(?:^|[},\s])(?:html|body)\s*(?:,[^{]*)?\{([^}]*)\}/gi)) {
      const value = m[1].match(prop)?.[1];
      const hex = toHex(value);
      if (hex) return hex;
    }
    return undefined;
  };
  // Without a page rule, a logo on a dark plate (an app-style icon) says the brand is dark.
  const background = pageRule(/background(?:-color)?\s*:\s*([^;]+)/i) ?? normaliseHex(manifest?.background_color) ?? logoPalette?.dark ?? undefined;
  const dark = background ? luminance(background) < 0.18 : false;
  let text = pageRule(/(?:^|;|\s)color\s*:\s*([^;]+)/i) ?? (dark ? undefined : ranked.find((h) => isGrey(h) && hexToRgb(h).r < 70));
  if (background && (!text || contrastRatio(text, background) < 4.5)) text = dark ? "#f5f5f5" : "#111111";

  // Fonts: Google Fonts links, then font-family declarations (first non-generic family).
  const googleFonts = [...new Set(links.filter((t) => /fonts\.googleapis\.com/.test(t)).flatMap((t) => [...(attr(t, "href") ?? "").matchAll(/family=([^:&;]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, " ")))))];
  const families = [...all.matchAll(/font-family\s*:\s*([^;}]+)/gi)]
    .map((m) => m[1].split(",")[0].trim().replace(/^["']|["']$/g, ""))
    .filter((f) => f && !/^(inherit|initial|sans-serif|serif|monospace|system-ui|-apple-system|var\(.*)$/i.test(f));
  const headingMatch = all.match(/h1[^{]*\{[^}]*font-family\s*:\s*([^;}]+)/i)?.[1]?.split(",")[0].trim().replace(/^["']|["']$/g, "");

  return {
    logo: logoUrls[0],
    logoCandidates: logoUrls.slice(1),
    logoSvg,
    icons,
    favicon: icons[0],
    socialImage: abs(attr(ogImage ?? "", "content"), baseUrl),
    colors: { primary, accent, text, background, surface: background && text ? mix(background, text, dark ? 0.08 : 0.04) : undefined },
    mode: background ? (dark ? "dark" : "light") : undefined,
    fonts: { heading: headingMatch || googleFonts[0] || families[0], body: families[0] || googleFonts[0] },
    googleFonts,
  };
}

/**
 * Colours of a logo or icon from its raw pixels (RGBA, e.g. sharp's `.raw()` of a small copy):
 * vivid colours by area, the plate colour behind it when the border is opaque, and that plate
 * again as `dark` when it is dark (an app icon on black says "dark brand").
 */
export function paletteFromPixels(data: Uint8Array, width: number, height: number, channels = 4): ImagePalette {
  type Bucket = { n: number; r: number; g: number; b: number };
  const buckets = new Map<number, Bucket>();
  const border = new Map<number, Bucket>();
  let borderTotal = 0;
  let borderOpaque = 0;
  const key = (r: number, g: number, b: number) => ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
  const put = (map: Map<number, Bucket>, k: number, r: number, g: number, b: number) => {
    const x = map.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    x.n++;
    x.r += r;
    x.g += g;
    x.b += b;
    map.set(k, x);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const a = channels === 4 ? data[i + 3] : 255;
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (edge) borderTotal++;
      if (a < 160) continue;
      if (edge) {
        borderOpaque++;
        put(border, key(r, g, b), r, g, b);
      }
      put(buckets, key(r, g, b), r, g, b);
    }
  }
  const avg = (x: Bucket) => normaliseHex(rgbToHex(x.r / x.n, x.g / x.n, x.b / x.n))!;
  const total = [...buckets.values()].reduce((sum, x) => sum + x.n, 0) || 1;
  const plate = borderTotal && borderOpaque / borderTotal > 0.8 ? [...border.values()].sort((a, b) => b.n - a.n)[0] : undefined;
  const background = plate && plate.n / borderOpaque > 0.6 ? avg(plate) : undefined;
  // An icon on a plate of the brand colour (white mark on purple): the plate is the brand colour.
  const vivid: string[] = background && brandish(background) ? [background] : [];
  for (const b of [...buckets.values()].sort((p, q) => q.n - p.n)) {
    if (b.n / total < 0.015) break;
    const hex = avg(b);
    const { r, g, b: bl } = hexToRgb(hex);
    const max = Math.max(r, g, bl);
    const sat = max ? (max - Math.min(r, g, bl)) / max : 0;
    if (sat < 0.28 || max < 60) continue;
    if (background && colourDistance(hex, background) < 40) continue;
    if (!brandish(hex) && sat < 0.45) continue;
    if (vivid.some((v) => colourDistance(v, hex) < 48)) continue;
    vivid.push(hex);
    if (vivid.length >= 4) break;
  }
  // The ink: the largest colour that is not the plate, also when it is black or grey.
  const inkBucket = [...buckets.values()].sort((p, q) => q.n - p.n).find((b) => b.n / total >= 0.03 && (!background || colourDistance(avg(b), background) >= 60));
  const ink = inkBucket ? avg(inkBucket) : undefined;
  return { vivid, background, dark: background && luminance(background) < 0.06 ? background : undefined, ink };
}
