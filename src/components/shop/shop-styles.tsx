import type { CSSProperties } from "react";
import { themeVars, type ShopTheme } from "@/lib/shop/theme";

/** The theme as inline CSS variables (root of the shop and of the editor previews). */
export function themeStyle(theme: ShopTheme): CSSProperties {
  return themeVars(theme) as CSSProperties;
}

/**
 * Component classes of the shop, written once against the --shop-* variables. Kept as a plain
 * stylesheet so the editor preview and the shop render identically.
 */
export const SHOP_CSS = `
.shop-root{background:var(--shop-bg);color:var(--shop-text);font-family:var(--shop-font-body);}
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
.shop-prose ul{list-style:disc;padding-left:1.25rem;}
.shop-prose ol{list-style:decimal;padding-left:1.25rem;}
.shop-prose a{color:var(--shop-primary);text-decoration:underline;}
.shop-prose blockquote{border-left:3px solid var(--shop-line);padding-left:1rem;color:var(--shop-muted);}
.shop-root :focus-visible{outline:2px solid var(--shop-primary);outline-offset:2px;}
`;
