/**
 * Shop theme = design tokens (isomorphic, unit-tested). Stored as JSON in shop_themes
 * (draft/published); the shop, the PDF voucher, wallet passes and mails all read the same set.
 */
import { z } from "zod";
import { contrastRatio, mix, normaliseHex, readableOn } from "@/lib/design/color";
import { fontCssFormat } from "@/lib/design/font-file";
import { SOCIAL_NETWORKS } from "./social";
import { fontCssUrl } from "@/lib/design/font-proxy";

const hex = z.string().transform((v, ctx) => {
  const n = normaliseHex(v);
  if (!n) {
    ctx.addIssue({ code: "custom", message: "colour" });
    return z.NEVER;
  }
  return n;
});
const url = z.string().max(1000).url().or(z.literal("")).default("");

export const fontSchema = z.object({
  source: z.enum(["system", "google", "custom"]).default("system"),
  family: z.string().max(80).default(""),
  /** Uploaded font file: woff2, woff, ttf or otf (source "custom"). */
  url: url,
});
export type ThemeFont = z.infer<typeof fontSchema>;

/** Background of the hero on one device: the picture, a colour, a gradient or none (text only, compact). */
const heroBackdrop = z.object({
  kind: z.enum(["image", "color", "gradient", "none"]).default("image"),
  from: hex.default("#ff4b23"),
  to: hex.default("#7a1fa2"),
  direction: z.enum(["down", "right", "diagonal"]).default("diagonal"),
});
export type HeroBackdrop = z.infer<typeof heroBackdrop>;
const HERO_BACKDROP: HeroBackdrop = { kind: "image", from: "#ff4b23", to: "#7a1fa2", direction: "diagonal" };

/** Themes saved with the former «show only on …» choice: the other device keeps the text without picture. */
function upgradeHero(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || !("show" in raw)) return raw;
  const { show, ...hero } = raw as Record<string, unknown>;
  const none = { ...HERO_BACKDROP, kind: "none" };
  return { ...hero, ...(show === "desktop" && !hero.mobile ? { mobile: none } : {}), ...(show === "mobile" && !hero.desktop ? { desktop: none } : {}) };
}

export const themeSchema = z.object({
  colors: z
    .object({
      primary: hex.default("#ff4b23"),
      accent: hex.default("#111111"),
      background: hex.default("#ffffff"),
      surface: hex.default("#f5f5f5"),
      text: hex.default("#111111"),
      success: hex.default("#1a7f37"),
      warning: hex.default("#b25e00"),
    })
    .default({ primary: "#ff4b23", accent: "#111111", background: "#ffffff", surface: "#f5f5f5", text: "#111111", success: "#1a7f37", warning: "#b25e00" }),
  fonts: z
    .object({ heading: fontSchema.default({ source: "system", family: "", url: "" }), body: fontSchema.default({ source: "system", family: "", url: "" }) })
    .default({ heading: { source: "system", family: "", url: "" }, body: { source: "system", family: "", url: "" } }),
  radius: z.number().int().min(0).max(28).default(12),
  buttonStyle: z.enum(["solid", "outline", "pill"]).default("solid"),
  cardStyle: z.enum(["flat", "bordered", "elevated"]).default("elevated"),
  listLayout: z.enum(["grid", "list", "featured"]).default("grid"),
  mode: z.enum(["light", "dark"]).default("light"),
  /**
   * Header: a bar above the page, or one block with the hero (start page). Background none, a
   * colour or a gradient; the text colour follows the background automatically.
   */
  header: z
    .object({
      style: z.enum(["bar", "integrated"]).default("bar"),
      fill: z.enum(["none", "color", "gradient"]).default("none"),
      from: hex.default("#ff4b23"),
      to: hex.default("#7a1fa2"),
      direction: z.enum(["down", "right", "diagonal"]).default("diagonal"),
    })
    .default({ style: "bar", fill: "none", from: "#ff4b23", to: "#7a1fa2", direction: "diagonal" }),
  /**
   * Hero, always on every screen; `desktop` (and tablet) and `mobile` (below 640 px) choose their own
   * background. `imageMobile`: own picture for phones, else `image`. `focus…` (0–100 %): the point of
   * that picture that stays visible when it is cropped. `edge`: a picture, colour or gradient ends
   * with a line or fades into the page (deals overlap it).
   */
  hero: z.preprocess(
    upgradeHero,
    z
      .object({
        enabled: z.boolean().default(true),
        title: z.string().max(120).default(""),
        subtitle: z.string().max(240).default(""),
        image: url,
        focusX: z.number().min(0).max(100).default(50),
        focusY: z.number().min(0).max(100).default(50),
        imageMobile: url,
        focusMobileX: z.number().min(0).max(100).default(50),
        focusMobileY: z.number().min(0).max(100).default(50),
        edge: z.enum(["line", "fade"]).default("line"),
        desktop: heroBackdrop.default(HERO_BACKDROP),
        mobile: heroBackdrop.default(HERO_BACKDROP),
      })
      .default({ enabled: true, title: "", subtitle: "", image: "", focusX: 50, focusY: 50, imageMobile: "", focusMobileX: 50, focusMobileY: 50, edge: "line", desktop: HERO_BACKDROP, mobile: HERO_BACKDROP }),
  ),
  logoLight: url,
  logoDark: url,
  /** Optional logo in the footer (above the icons), separate from the header logo. */
  footerLogoLight: url,
  footerLogoDark: url,
  favicon: url,
  socialImage: url,
  footerLinks: z.array(z.object({ label: z.string().max(60), url: z.string().max(500) })).max(12).default([]),
  /** Social media icons in the footer: the entry as typed (link or @handle), shown only via `socialUrl`. */
  socialLinks: z.array(z.object({ network: z.enum(SOCIAL_NETWORKS), url: z.string().max(300) })).max(SOCIAL_NETWORKS.length).default([]),
});
export type ShopTheme = z.infer<typeof themeSchema>;

/** Any stored JSON → a complete theme (unknown or broken values fall back to defaults). */
export function parseTheme(raw: unknown): ShopTheme {
  const result = themeSchema.safeParse(raw ?? {});
  if (result.success) return result.data;
  // Keep what is valid, field by field.
  const base = themeSchema.parse({});
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(base) as Array<keyof ShopTheme>) {
      const one = themeSchema.shape[key].safeParse((raw as Record<string, unknown>)[key]);
      if (one.success) (base as Record<string, unknown>)[key] = one.data;
    }
  }
  return base;
}

export const DEFAULT_THEME: ShopTheme = themeSchema.parse({});

const SYSTEM_STACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function fontStack(font: ThemeFont): string {
  if (font.source === "system" || !font.family) return SYSTEM_STACK;
  return `"${font.family.replace(/"/g, "")}", ${SYSTEM_STACK}`;
}

export type HeroLook = { kind: "image" | "fill" | "header" | "plain"; url: string; position: string; background: string; text: string; tone: "light" | "dark" };

/** How the hero looks on one device (a picture without an upload counts as none). */
export function heroLook(theme: ShopTheme, device: "desktop" | "mobile"): HeroLook {
  const h = theme.hero;
  const b = h[device];
  const own = device === "mobile" && h.imageMobile;
  const url = own ? h.imageMobile : h.image;
  const plain: HeroLook = { kind: "plain", url: "", position: "", background: "transparent", text: theme.colors.text, tone: theme.mode };
  if (b.kind === "image" && url) return { ...plain, kind: "image", url, position: own ? `${h.focusMobileX}% ${h.focusMobileY}%` : `${h.focusX}% ${h.focusY}%`, text: "#ffffff", tone: "dark" };
  if (b.kind === "color" || b.kind === "gradient") {
    const text = readableOn(b.kind === "color" ? b.from : mix(b.from, b.to, 0.5), "#111111", "#ffffff");
    return { ...plain, kind: "fill", background: b.kind === "color" ? b.from : `linear-gradient(${ANGLE[b.direction]}, ${b.from}, ${b.to})`, text, tone: text === "#ffffff" ? "dark" : "light" };
  }
  // Header and hero as one coloured block: the hero keeps the header's ground.
  if (theme.header.style === "integrated" && theme.header.fill !== "none") return { ...plain, kind: "header", background: "var(--shop-header-bg)", text: headerLook(theme).text, tone: headerLook(theme).tone };
  return plain;
}

/** The footer logo for the footer's background (surface colour), "" without one. */
export function footerLogo(theme: ShopTheme): string {
  const dark = readableOn(theme.colors.surface, "#111111", "#ffffff") === "#ffffff";
  return dark ? theme.footerLogoDark || theme.footerLogoLight : theme.footerLogoLight || theme.footerLogoDark;
}

const ANGLE = { down: "180deg", right: "90deg", diagonal: "135deg" } as const;

/** The header's ground as one colour (gradient: its middle; no fill: the page background). */
export function headerBase(theme: ShopTheme): string {
  const h = theme.header;
  return h.fill === "none" ? theme.colors.background : h.fill === "color" ? h.from : mix(h.from, h.to, 0.5);
}

/** The logo variant made for the header's ground, "" without a logo. */
export function headerLogo(theme: ShopTheme): string {
  return headerLook(theme).tone === "dark" ? theme.logoDark || theme.logoLight : theme.logoLight || theme.logoDark;
}

/** Deal alert button: filled on a picture, outlined in the primary colour where that reads, else in the text colour. */
export function alertLook(theme: ShopTheme): "filled" | "primary" | "text" {
  if (theme.header.style === "integrated" && theme.hero.enabled) {
    const kinds = [heroLook(theme, "desktop").kind, heroLook(theme, "mobile").kind];
    if (kinds.includes("fill")) return "text";
    if (kinds.includes("image")) return "filled";
  }
  return contrastRatio(theme.colors.primary, headerBase(theme)) >= 3 ? "primary" : "text";
}

/** Header background (CSS value), its text colour and whether it reads as dark. */
export function headerLook(theme: ShopTheme): { background: string; text: string; tone: "light" | "dark" } {
  const h = theme.header;
  if (h.fill === "none") return { background: "transparent", text: theme.colors.text, tone: theme.mode };
  const base = h.fill === "color" ? h.from : mix(h.from, h.to, 0.5);
  const text = readableOn(base, "#111111", "#ffffff");
  return {
    background: h.fill === "color" ? h.from : `linear-gradient(${ANGLE[h.direction]}, ${h.from}, ${h.to})`,
    text,
    tone: text === "#ffffff" ? "dark" : "light",
  };
}

/** CSS custom properties for a theme (applied on the shop's root element). */
export function themeVars(theme: ShopTheme): Record<string, string> {
  const c = theme.colors;
  const dark = theme.mode === "dark";
  const bg = c.background;
  const line = mix(c.surface, c.text, dark ? 0.18 : 0.1);
  return {
    "--shop-primary": c.primary,
    "--shop-on-primary": readableOn(c.primary),
    "--shop-accent": c.accent,
    "--shop-on-accent": readableOn(c.accent),
    "--shop-bg": bg,
    "--shop-surface": c.surface,
    "--shop-text": c.text,
    "--shop-muted": mix(c.text, bg, 0.38),
    "--shop-line": line,
    "--shop-success": c.success,
    "--shop-warning": c.warning,
    "--shop-radius": `${theme.radius}px`,
    "--shop-radius-button": theme.buttonStyle === "pill" ? "999px" : `${Math.min(theme.radius, 16)}px`,
    "--shop-font-heading": fontStack(theme.fonts.heading),
    "--shop-font-body": fontStack(theme.fonts.body),
    "--shop-header-bg": headerLook(theme).background,
    "--shop-on-header": headerLook(theme).text,
  };
}

/** Stylesheet URLs / @font-face rules the theme needs (Google via our proxy, uploads from storage). */
export function themeFontCss(theme: ShopTheme): { links: string[]; faces: string } {
  const links: string[] = [];
  let faces = "";
  for (const font of [theme.fonts.heading, theme.fonts.body]) {
    if (font.source === "google" && font.family) {
      const href = fontCssUrl(`family=${encodeURIComponent(font.family).replace(/%20/g, "+")}:wght@400;600;700&display=swap`);
      if (!links.includes(href)) links.push(href);
    }
    if (font.source === "custom" && font.family && font.url) {
      faces += `@font-face{font-family:"${font.family.replace(/"/g, "")}";src:url("${font.url.replace(/"/g, "")}") format("${fontCssFormat(font.url)}");font-display:swap;}`;
    }
  }
  return { links, faces };
}

export type ContrastIssue = { pair: string; ratio: number; min: number };

/**
 * WCAG AA checks for the pairs a shop actually renders. Text on its grounds needs 4.5:1;
 * buttons get readable label colours automatically, so only their outline use (primary as text
 * on the background) is checked.
 */
export function contrastIssues(theme: ShopTheme): ContrastIssue[] {
  const c = theme.colors;
  const pairs: Array<[string, string, string, number]> = [
    ["text/background", c.text, c.background, 4.5],
    ["text/surface", c.text, c.surface, 4.5],
    ["primary/background", c.primary, c.background, 3],
    ["accent/background", c.accent, c.background, 3],
    ["primary-label", readableOn(c.primary), c.primary, 4.5],
  ];
  return pairs
    .map(([pair, a, b, min]) => ({ pair, ratio: Math.round(contrastRatio(a, b) * 100) / 100, min }))
    .filter((p) => p.ratio < p.min);
}
