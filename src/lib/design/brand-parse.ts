/**
 * Pure part of the branding import (unit-tested): reads logo, icon, colours and fonts out of a
 * page's HTML and CSS. Everything is a suggestion; nothing is applied automatically.
 */
import { hexToRgb, normaliseHex, rgbToHex } from "./color";

export type BrandingSuggestion = {
  logo?: string;
  favicon?: string;
  socialImage?: string;
  colors: { primary?: string; accent?: string; text?: string; background?: string };
  fonts: { heading?: string; body?: string };
  googleFonts: string[];
};

const abs = (href: string | undefined, base: string) => {
  if (!href) return undefined;
  try {
    const u = new URL(href.trim(), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];

function isGrey(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

export function extractBranding(html: string, css: string, baseUrl: string): BrandingSuggestion {
  const tags = (re: RegExp) => [...html.matchAll(re)].map((m) => m[0]);
  const links = tags(/<link\b[^>]*>/gi);
  const metas = tags(/<meta\b[^>]*>/gi);
  const imgs = tags(/<img\b[^>]*>/gi);

  // Logo: an <img> that calls itself a logo (src, alt, class or id), preferring SVG.
  const logoTags = imgs.filter((t) => /logo/i.test(`${attr(t, "src")} ${attr(t, "alt")} ${attr(t, "class")} ${attr(t, "id")}`));
  const logoTag = logoTags.find((t) => /\.svg/i.test(attr(t, "src") ?? "")) ?? logoTags[0];
  const icon =
    links.find((t) => /rel=["'][^"']*apple-touch-icon/i.test(t)) ??
    links.find((t) => /rel=["'](?:shortcut )?icon["']/i.test(t) && /\.(png|svg)/i.test(attr(t, "href") ?? "")) ??
    links.find((t) => /rel=["'](?:shortcut )?icon["']/i.test(t));
  const ogImage = metas.find((t) => /property=["']og:image["']/i.test(t));
  const themeColor = metas.find((t) => /name=["']theme-color["']/i.test(t));

  // Colours: theme-color first, then the most used non-grey colours of the page.
  const counts = new Map<string, number>();
  const all = `${html.match(/<style[\s\S]*?<\/style>/gi)?.join("\n") ?? ""}\n${tags(/style=["'][^"']*["']/gi).join("\n")}\n${css}`;
  for (const m of all.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const hex = normaliseHex(m[0]);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  for (const m of all.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) {
    const hex = rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])).toLowerCase();
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  const vivid = ranked.filter((h) => !isGrey(h));
  const primary = normaliseHex(attr(themeColor ?? "", "content")) ?? vivid[0];
  const accent = vivid.find((h) => h !== primary);
  const dark = ranked.find((h) => isGrey(h) && hexToRgb(h).r < 70);

  // Fonts: Google Fonts links, then font-family declarations (first non-generic family).
  const googleFonts = [...new Set(links.filter((t) => /fonts\.googleapis\.com/.test(t)).flatMap((t) => [...(attr(t, "href") ?? "").matchAll(/family=([^:&;]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, " ")))))];
  const families = [...all.matchAll(/font-family\s*:\s*([^;}]+)/gi)]
    .map((m) => m[1].split(",")[0].trim().replace(/^["']|["']$/g, ""))
    .filter((f) => f && !/^(inherit|initial|sans-serif|serif|monospace|system-ui|-apple-system|var\(.*)$/i.test(f));
  const headingMatch = all.match(/h1[^{]*\{[^}]*font-family\s*:\s*([^;}]+)/i)?.[1]?.split(",")[0].trim().replace(/^["']|["']$/g, "");

  return {
    logo: abs(attr(logoTag ?? "", "src"), baseUrl),
    favicon: abs(attr(icon ?? "", "href"), baseUrl),
    socialImage: abs(attr(ogImage ?? "", "content"), baseUrl),
    colors: { primary, accent, text: dark },
    fonts: { heading: headingMatch || googleFonts[0] || families[0], body: families[0] || googleFonts[0] },
    googleFonts,
  };
}
