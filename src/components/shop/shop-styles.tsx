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
 * Hero rules of one device class. Each device has its own background (`data-desktop` /
 * `data-mobile`: image, fill, header, plain); a header in one block with the hero follows its tone.
 */
function heroDeviceCss(device: "desktop" | "mobile"): string {
  const phone = device === "mobile";
  const v = phone ? "-mobile" : "";
  const hero = (kind: string) => `.shop-hero[data-${device}="${kind}"]`;
  const visible = `:not([style*="display: none"]):not([style*="display: none"] *)`;
  const header = (sel: string) => `.shop-root[data-header="integrated"]:has(${sel}${visible}) .shop-header`;
  const fade = (kind: string) => `.shop-hero-fade[data-${device}="${kind}"]`;
  const pad = (top: string, bottom: string) => `{padding-top:${top};padding-bottom:${bottom};}`;
  const soft = phone ? "7rem" : "11rem";
  const mask = `linear-gradient(to bottom,#000 calc(100% - ${soft}),transparent)`;
  const fillMask = `linear-gradient(to bottom,#000 calc(100% - ${phone ? "5rem" : "8rem"}),transparent)`;
  return [
    `.shop-hero{background:var(--hero-bg${v});color:var(--hero-text${v});}`,
    `.shop-hero-img{object-position:var(--hero-pos${v});}`,
    `.shop-hero:not([data-${device}="image"]) .shop-hero-media{display:none;}`,
    `.shop-root[data-header="integrated"]:has(.shop-hero${visible}) .shop-header{background:transparent;}`,
    ...["dark", "light"].flatMap((tone) => {
      const h = header(`.shop-hero[data-${device}-tone="${tone}"]:not([data-${device}="plain"])`);
      return [`${h}{color:${tone === "dark" ? "#fff" : "#111"};}`, `${h} .shop-logo-for-light{display:${tone === "dark" ? "none" : "block"};}`, `${h} .shop-logo-for-dark{display:${tone === "dark" ? "block" : "none"};}`];
    }),
    `${hero("image")} .shop-hero-text{display:flex;flex-direction:column;justify-content:flex-end;min-height:${phone ? "20rem" : "26rem"};}`,
    `${hero("image")} .shop-hero-text${phone ? pad("3rem", "3rem") : pad("5rem", "5rem")}`,
    `${hero("fill")} .shop-hero-text,${hero("header")} .shop-hero-text${phone ? pad("2.25rem", "2.25rem") : pad("3rem", "3rem")}`,
    // Text only: the same distance above the headline and below the text up to the deals.
    `${hero("plain")} .shop-hero-text${phone ? pad("1.75rem", ".5rem") : pad("2.5rem", "1.25rem")}`,
    `${hero("plain")} + .shop-below .shop-list-top{height:1.5rem;}`,
    `${fade("image")} .shop-hero-text{min-height:${phone ? "24rem" : "30rem"};padding-bottom:${phone ? "7.5rem" : "11.5rem"};}`,
    `${fade("image")} .shop-hero-media{-webkit-mask-image:${mask};mask-image:${mask};}`,
    `${fade("image")} + .shop-below{position:relative;margin-top:${phone ? "-5rem" : "-8.5rem"};}`,
    `${fade("image")} + .shop-below .shop-chip:not([aria-current="page"]){background:var(--shop-bg);}`,
    // Colour or gradient: the ground fades out (a masked layer below the text), deals move up over it.
    ...["fill", "header"].flatMap((kind) => [
      `${fade(kind)}{background:transparent;}`,
      `${fade(kind)}::before{content:"";position:absolute;inset:0;background:var(--hero-bg${v});-webkit-mask-image:${fillMask};mask-image:${fillMask};}`,
      `${fade(kind)} .shop-hero-text{padding-bottom:${phone ? "6rem" : "8.5rem"};}`,
      `${fade(kind)} + .shop-below{position:relative;margin-top:${phone ? "-3.5rem" : "-5.5rem"};}`,
      `${fade(kind)} + .shop-below .shop-chip:not([aria-current="page"]){background:var(--shop-bg);}`,
    ]),
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
.shop-alert-btn{display:inline-flex;align-items:center;gap:.45rem;flex-shrink:0;height:2.5rem;padding:0 .95rem;border-radius:var(--shop-radius-button);border:1.5px solid currentColor;font-size:.9375rem;line-height:1;font-weight:700;font-synthesis:none;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;white-space:nowrap;cursor:pointer;transition:background .15s ease,color .15s ease;}
.shop-alert-primary{color:var(--shop-primary);}
.shop-alert-btn svg{transform-origin:50% 10%;}
@keyframes shop-bell{0%,20%,100%{transform:rotate(0)}2%{transform:rotate(16deg)}5%{transform:rotate(-14deg)}8%{transform:rotate(11deg)}11%{transform:rotate(-8deg)}14%{transform:rotate(5deg)}17%{transform:rotate(-3deg)}}
@media (prefers-reduced-motion:no-preference){.shop-alert-btn[aria-expanded="false"] svg{animation:shop-bell 5s ease-in-out 2s infinite;}}
.shop-alert-filled,.shop-alert-primary:hover,.shop-alert-btn[aria-expanded="true"]{background:var(--shop-primary);border-color:var(--shop-primary);color:var(--shop-on-primary);}
.shop-alert-dialog{position:fixed;inset:auto 0 0 0;margin:0;padding:0;width:100%;max-width:none;max-height:90dvh;overflow:auto;border:0;border-radius:1.5rem 1.5rem 0 0;background:var(--shop-surface);color:var(--shop-text);font-family:var(--shop-font-body);}
.shop-alert-dialog::backdrop{background:rgb(0 0 0/.6);}
.shop-alert-body{position:relative;padding:.9rem 1.25rem calc(2rem + env(safe-area-inset-bottom));}
.shop-alert-grab{display:block;width:2.75rem;height:.3rem;margin:0 auto 1.25rem;border-radius:99px;background:var(--shop-line);}
@media (min-width:640px){
.shop-alert-btn{height:2.75rem;padding:0 1.25rem;font-size:1rem;}
.shop-alert-dialog{inset:var(--alert-top) var(--alert-right) auto auto;width:25rem;border:1px solid var(--shop-line);border-radius:1.1rem;box-shadow:0 30px 80px rgb(0 0 0/.45);}
.shop-alert-dialog::backdrop{background:transparent;}
.shop-alert-body{padding:1.75rem;}
.shop-alert-grab{display:none;}
}
.shop-header[data-tone="dark"] .shop-logo-for-light{display:none;}
.shop-header[data-tone="dark"] .shop-logo-for-dark{display:block;}
@media (max-width:639.98px){${heroDeviceCss("mobile")}}
@media (min-width:640px){${heroDeviceCss("desktop")}}
.shop-root[data-header="integrated"] .shop-hero{margin-top:calc(-1 * var(--shop-header-h));padding-top:var(--shop-header-h);}
.shop-hero-top-shade{display:none;}
.shop-root[data-header="integrated"] .shop-hero-top-shade{display:block;}
`;
