/**
 * Pure part of the branding import (unit-tested): reads logo, icon, colours and fonts out of a
 * page's HTML and CSS. Everything is a suggestion; nothing is applied automatically.
 */
import { contrastRatio, hexToRgb, luminance, mix, normaliseHex, rgbToHex } from "./color";

export type BrandingSuggestion = {
  logo?: string;
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

/** Custom properties of UI libraries (sliders, icon sets, CSS frameworks, CMS presets). */
const LIBRARY_VARS = /--(?:swiper|bs-|wp--|tw-|fa-|plyr|toastify|mdc-|mat-|chakra|mantine|splide|glide|slick|owl|aos)[\w-]*\s*:[^;}]*/gi;
const BRAND_NAME = /primary|brand|accent|main|theme|highlight|cta|corporate/i;
const NOT_BRAND = /text|font|bg|background|border|shadow|sub|muted|grey|gray|disabled|placeholder|overlay|premium|error|danger|success|warning/i;
const brandRank = (name: string) => (/brand|corporate/i.test(name) ? 0 : /primary/i.test(name) ? 1 : /accent|highlight|cta/i.test(name) ? 2 : 3);

export function extractBranding(html: string, css: string, baseUrl: string, manifest?: { theme_color?: string; background_color?: string } | null): BrandingSuggestion {
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
  const vivid = ranked.filter((h) => !isGrey(h));

  // Brand variables: name says primary/brand/accent…, value is a non-grey colour.
  const brandVars = [...cleaned.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)]
    .map((m) => ({ name: m[1], hex: toHex(m[2]) }))
    .filter((v): v is { name: string; hex: string } => Boolean(v.hex) && !isGrey(v.hex!) && BRAND_NAME.test(v.name) && !NOT_BRAND.test(v.name))
    .sort((a, b) => brandRank(a.name) - brandRank(b.name));

  const manifestTheme = normaliseHex(manifest?.theme_color) ?? undefined;
  const metaTheme = normaliseHex(attr(themeColor ?? "", "content")) ?? undefined;
  const pick = [metaTheme, manifestTheme].find((h) => h && !isGrey(h));
  const primary = pick ?? brandVars[0]?.hex ?? vivid[0];
  const accent = brandVars.find((v) => v.hex !== primary)?.hex ?? vivid.find((h) => h !== primary);

  // Page background and text: the body/html rule, else the manifest's background colour.
  const pageRule = (prop: RegExp) => {
    for (const m of cleaned.matchAll(/(?:^|[},\s])(?:html|body)\s*(?:,[^{]*)?\{([^}]*)\}/gi)) {
      const value = m[1].match(prop)?.[1];
      const hex = toHex(value);
      if (hex) return hex;
    }
    return undefined;
  };
  const background = pageRule(/background(?:-color)?\s*:\s*([^;]+)/i) ?? normaliseHex(manifest?.background_color) ?? undefined;
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
    logo: abs(attr(logoTag ?? "", "src"), baseUrl),
    favicon: abs(attr(icon ?? "", "href"), baseUrl),
    socialImage: abs(attr(ogImage ?? "", "content"), baseUrl),
    colors: { primary, accent, text, background, surface: background && text ? mix(background, text, dark ? 0.08 : 0.04) : undefined },
    mode: background ? (dark ? "dark" : "light") : undefined,
    fonts: { heading: headingMatch || googleFonts[0] || families[0], body: families[0] || googleFonts[0] },
    googleFonts,
  };
}
