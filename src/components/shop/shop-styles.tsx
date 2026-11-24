import type { CSSProperties } from "react";
import { themeVars, type ShopTheme } from "@/lib/shop/theme";

/** The theme as inline CSS variables (root of the shop and of the editor previews). */
export function themeStyle(theme: ShopTheme): CSSProperties {
  return themeVars(theme) as CSSProperties;
}

/** Data attributes the shop stylesheet switches on (root of the shop and of the previews). */
export function themeAttrs(theme: ShopTheme) {
  return { "data-card": theme.cardStyle, "data-button": theme.buttonStyle, "data-mode": theme.mode, "data-header": theme.header.style, "data-header-fill": theme.header.fill };
}

/**
 * Page chrome of a shop (not the editor preview): native scrollbar, form controls and the
 * overscroll area follow the theme instead of the browser's default light grey. Colours are
 * validated hex values from the theme.
 */
export function pageChromeCss(theme: ShopTheme): string {
  const bg = theme.colors.background;
  const thumb = `color-mix(in srgb, ${theme.colors.text} 32%, ${bg})`;
  return `html{color-scheme:${theme.mode === "dark" ? "dark" : "light"};background:${bg};scrollbar-color:${thumb} ${bg};}body{background:${bg};}`;
}

/**
 * Hero rules of one device class: `hiddenFor` is the `data-show` value that hides the hero there
 * ("desktop" = hero only on desktop, so hidden on phones). The header only merges with a hero, and
 * the deals only move up over a fading picture, where the hero is visible.
 */
function heroDeviceCss(hiddenFor: "desktop" | "mobile"): string {
  const visible = `:not([data-show="${hiddenFor}"]):not([style*="display: none"]):not([style*="display: none"] *)`;
  const root = (hero: string) => `.shop-root[data-header="integrated"]:has(${hero}${visible}) .shop-header`;
  return [
    `.shop-hero[data-show="${hiddenFor}"]{display:none;}`,
    `${root(".shop-hero")}{background:transparent;}`,
    `${root(".shop-hero-image")}{color:#fff;}`,
    `${root(".shop-hero-image")} .shop-logo-for-light{display:none;}`,
    `${root(".shop-hero-image")} .shop-logo-for-dark{display:block;}`,
    `.shop-hero-fade:not([data-show="${hiddenFor}"]) + .shop-below{position:relative;margin-top:${hiddenFor === "desktop" ? "-5rem" : "-8.5rem"};}`,
  ].join("\n");
}

/**
 * Component classes of the shop, written once against the --shop-* variables. Kept as a plain
 * stylesheet so the editor preview and the shop render identically.
 * Next 16 keeps the previous page mounted but hidden (inline `display: none`), so the header
 * rules only look at a hero that is actually visible.
 */
export const SHOP_CSS = `
.shop-root{background:var(--shop-bg);color:var(--shop-text);font-family:var(--shop-font-body);}
.shop-root{--surface:var(--shop-bg);--surface-2:var(--shop-surface);--line:var(--shop-line);--ink:var(--shop-text);--muted:var(--shop-muted);--accent:var(--shop-primary);--accent-text:var(--shop-text);--sc-radius-input:var(--shop-radius);}
.shop-heading{font-family:var(--shop-font-heading);}
.shop-card{background:var(--shop-surface);border-radius:var(--shop-radius);color:inherit;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease;}
.shop-root[data-card="bordered"] .shop-card{background:var(--shop-bg);border:1px solid var(--shop-line);}
.shop-root[data-card="elevated"] .shop-card{background:var(--shop-bg);box-shadow:0 1px 2px rgb(0 0 0/.06),0 8px 24px rgb(0 0 0/.08);}
.shop-root[data-card="elevated"] a.shop-card:hover{transform:translateY(-2px);box-shadow:0 2px 4px rgb(0 0 0/.08),0 16px 32px rgb(0 0 0/.12);}
.shop-badge{display:inline-flex;align-items:center;border-radius:999px;padding:.2rem .6rem;font-size:.75rem;font-weight:700;background:var(--shop-bg);color:var(--shop-text);}
.shop-badge-primary{background:var(--shop-primary);color:var(--shop-on-primary);}
.shop-badge-dark{background:var(--shop-text);color:var(--shop-bg);}
.shop-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:3rem;padding:0 1.5rem;border-radius:var(--shop-radius-button);font-weight:700;background:var(--shop-primary);color:var(--shop-on-primary);border:2px solid var(--shop-primary);transition:filter .15s ease;text-decoration:none;}
.shop-btn:hover{filter:brightness(.95);}
.shop-btn[aria-disabled="true"],.shop-btn:disabled{opacity:.5;pointer-events:none;}
.shop-root[data-button="outline"] .shop-btn{background:transparent;color:var(--shop-primary);}
.shop-chip{display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:.45rem 1rem;font-size:.875rem;font-weight:600;border:1px solid var(--shop-line);color:inherit;text-decoration:none;}
.shop-chip[aria-current="page"]{background:var(--shop-text);color:var(--shop-bg);border-color:var(--shop-text);}
.shop-prose{line-height:1.65;}
.shop-prose p{margin:.75rem 0;}
.shop-prose h2{font-family:var(--shop-font-heading);font-size:1.35rem;font-weight:700;margin:1.5rem 0 .5rem;}
.shop-prose h3{font-family:var(--shop-font-heading);font-size:1.1rem;font-weight:700;margin:1.25rem 0 .5rem;}
.shop-prose ul{list-style:disc outside;padding-left:1.5rem;margin:.75rem 0;}
.shop-prose ol{list-style:decimal outside;padding-left:1.75rem;margin:.75rem 0;}
.shop-prose ul ul{list-style-type:circle;margin:.25rem 0;}
.shop-prose ol ol{margin:.25rem 0;}
.shop-prose li{padding-left:.25rem;margin:.3rem 0;}
.shop-prose li>p{margin:0;}
.shop-prose li::marker{color:var(--shop-muted);}
.shop-prose a{color:var(--shop-primary);text-decoration:underline;}
.shop-prose blockquote{border-left:3px solid var(--shop-line);padding-left:1rem;color:var(--shop-muted);}
.shop-root :focus-visible{outline:2px solid var(--shop-primary);outline-offset:2px;}
.shop-root{--shop-header-h:4rem;}
@media (min-width:640px){.shop-root{--shop-header-h:5rem;}}
.shop-header{background:var(--shop-header-bg);color:var(--shop-on-header);position:relative;z-index:2;}
.shop-root:has(.shop-gate) .shop-header{display:none;}
.shop-root:has(.shop-gate-building) footer[data-testid="shop-footer"]{display:none;}
.shop-root:has(.shop-gate-closed) footer[data-testid="shop-footer"]{margin-top:0;}
.shop-root[data-header-fill="none"][data-header="bar"] .shop-header{border-bottom:1px solid var(--shop-line);}
.shop-logo-for-dark{display:none;}
.shop-header[data-tone="dark"] .shop-logo-for-light{display:none;}
.shop-header[data-tone="dark"] .shop-logo-for-dark{display:block;}
.shop-root[data-header="integrated"] .shop-hero{background:var(--shop-header-bg);color:var(--shop-on-header);}
.shop-root[data-header="integrated"] .shop-hero.shop-hero-fade{background:transparent;}
@media (max-width:639.98px){${heroDeviceCss("desktop")}}
@media (min-width:640px){${heroDeviceCss("mobile")}}
.shop-hero-img{object-position:var(--hero-pos);}
.shop-hero-text{padding-top:3rem;padding-bottom:3rem;}
.shop-hero-line .shop-hero-text{min-height:20rem;}
.shop-hero-fade .shop-hero-text{min-height:24rem;padding-bottom:7.5rem;}
.shop-hero-fade .shop-hero-media{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 7rem),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 7rem),transparent);}
.shop-hero-fade + .shop-below .shop-chip:not([aria-current="page"]){background:var(--shop-bg);}
@media (max-width:639.98px){.shop-hero-img{object-position:var(--hero-pos-mobile);}}
@media (min-width:640px){
.shop-hero-text{padding-top:5rem;padding-bottom:5rem;}
.shop-hero-filled .shop-hero-text{padding-top:3rem;padding-bottom:3rem;}
.shop-hero-plain .shop-hero-text{padding-top:2.5rem;padding-bottom:1.25rem;}
.shop-hero-plain + .shop-below .shop-list-top{height:1.5rem;}
.shop-hero-line .shop-hero-text{min-height:26rem;}
.shop-hero-fade .shop-hero-text{min-height:30rem;padding-bottom:11.5rem;}
.shop-hero-fade .shop-hero-media{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 11rem),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 11rem),transparent);}
}
.shop-root[data-header="integrated"] .shop-hero{margin-top:calc(-1 * var(--shop-header-h));padding-top:var(--shop-header-h);}
.shop-hero-top-shade{display:none;}
.shop-root[data-header="integrated"] .shop-hero-top-shade{display:block;}
`;
