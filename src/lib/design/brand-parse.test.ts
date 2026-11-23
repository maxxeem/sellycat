import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { extractBranding, paletteFromPixels } from "./brand-parse";
import { hexToRgb } from "./color";

const html = `<html><head>
<meta name="theme-color" content="#0A5C36">
<meta property="og:image" content="/og.jpg">
<link rel="apple-touch-icon" href="/apple.png">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato&display=swap" rel="stylesheet">
<style>body{color:#222222;font-family:"Lato",sans-serif} .btn{background:#e63946} .x{color:#e63946} h1{font-family:'Playfair Display',serif}</style>
</head><body><a href="/"><img class="site-logo" src="/img/logo.svg" alt="Firma"></a></body></html>`;

describe("extractBranding", () => {
  const s = extractBranding(html, "", "https://kunde.ch/start");
  it("finds logo, icon and share image as absolute URLs", () => {
    expect(s.logo).toBe("https://kunde.ch/img/logo.svg");
    expect(s.favicon).toBe("https://kunde.ch/apple.png");
    expect(s.socialImage).toBe("https://kunde.ch/og.jpg");
  });
  it("prefers theme-color, then frequent vivid colours", () => {
    expect(s.colors.primary).toBe("#0a5c36");
    expect(s.colors.accent).toBe("#e63946");
    expect(s.colors.text).toBe("#222222");
  });
  it("reads fonts", () => {
    expect(s.googleFonts).toEqual(["Playfair Display", "Lato"]);
    expect(s.fonts.heading).toBe("Playfair Display");
    expect(s.fonts.body).toBe("Lato");
  });
  it("ignores javascript: urls", () => expect(extractBranding('<img class="logo" src="javascript:alert(1)">', "", "https://x.ch").logo).toBeUndefined());
});

describe("extractBranding on an app-style site (only CSS, library colours, dark page)", () => {
  const css = `
    :root{--swiper-theme-color:#007aff}
    .swiper-button{color:#007aff;background:#42b6c9}.x{color:#42b6c9}
    body{background-color:#1c1c1c;color:#000}
    :root{--typographyPrimary:#7a5cf4;--textThemeColor:#ffffff;--moreThemeColor:#9b72ff;--premiumColor:#0b3d25}
    .a{color:#0d0d0d}.b{color:#0d0d0d}.c{color:#0d0d0d}`;
  const s = extractBranding("<html><head></head><body><div id=app></div></body></html>", css, "https://www.my105.ch/");
  it("takes the named brand colour, not the slider library's", () => {
    expect(s.colors.primary).toBe("#7a5cf4");
    expect(s.colors.accent).toBe("#9b72ff");
  });
  it("detects the dark page and a readable text colour", () => {
    expect(s.colors.background).toBe("#1c1c1c");
    expect(s.mode).toBe("dark");
    expect(s.colors.text).toBe("#f5f5f5");
  });
  it("uses the manifest theme colour when there is one", () => {
    expect(extractBranding("", css, "https://x.ch", { theme_color: "#e63946" }).colors.primary).toBe("#e63946");
  });
});

describe("logo candidates", () => {
  it("finds a logo by its wrapper, JSON-LD and the header picture", () => {
    const html = `<header><a class="navbar-logo" href="/"><img src="/brand/wordmark.png" alt="Firma"></a></header>
      <script type="application/ld+json">{"@type":"Organization","logo":{"@type":"ImageObject","url":"https://cdn.firma.ch/logo-ld.png"}}</script>`;
    const s = extractBranding(html, "", "https://firma.ch/");
    expect(s.logo).toBe("https://firma.ch/brand/wordmark.png");
    expect(s.logoCandidates).toEqual(["https://cdn.firma.ch/logo-ld.png"]);
  });
  it("takes an inline SVG logo when there is no logo picture", () => {
    const svg = `<svg class="site-logo" viewBox="0 0 100 30"><path d="${"M0 0L10 10".repeat(30)}" fill="#e63946"/></svg>`;
    const s = extractBranding(`<header><a href="/">${svg}</a></header>`, "", "https://firma.ch/");
    expect(s.logo).toBeUndefined();
    expect(s.logoSvg).toBe(svg);
  });
  it("orders icons: apple-touch-icon, manifest (largest), PNG favicons", () => {
    const html = `<link rel="icon" href="/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/f32.png"><link rel="apple-touch-icon" href="/apple.png">`;
    const s = extractBranding(html, "", "https://firma.ch/", { icons: [{ src: "https://firma.ch/i192.png", sizes: "192x192" }, { src: "https://firma.ch/i512.png", sizes: "512x512" }] });
    expect(s.icons).toEqual(["https://firma.ch/apple.png", "https://firma.ch/i512.png", "https://firma.ch/i192.png", "https://firma.ch/f32.png", "https://firma.ch/favicon.ico"]);
    expect(s.favicon).toBe("https://firma.ch/apple.png");
  });
});

describe("paletteFromPixels", () => {
  it("reads the brand colour and the dark plate of the my105 icon", async () => {
    const { data, info } = await sharp(readFileSync(new URL("./__fixtures__/my105-icon.png", import.meta.url))).resize({ width: 64, height: 64, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const p = paletteFromPixels(data, info.width, info.height, info.channels);
    expect(p.background).toBe("#000000");
    expect(p.dark).toBe("#000000");
    const { r, g, b } = hexToRgb(p.vivid[0]);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeLessThan(90);
  });
  it("ignores transparent pixels and has no plate for a transparent wordmark", () => {
    const w = 10;
    const px = new Uint8Array(w * w * 4);
    for (let i = 0; i < w * w; i++) if (i % w > 2 && i % w < 7 && i > 3 * w && i < 7 * w) px.set([30, 90, 200, 255], i * 4);
    expect(paletteFromPixels(px, w, w)).toEqual({ vivid: ["#1e5ac8"], background: undefined, dark: undefined, ink: "#1e5ac8" });
  });
});

describe("extractBranding on the my105 page shell (logo loaded by JavaScript)", () => {
  const html = readFileSync(new URL("./__fixtures__/my105-shell.html", import.meta.url), "utf8");
  const css = ":root{--swiper-theme-color:#007aff}.swiper-button-next{color:#007aff}.a{color:#007aff}";
  it("finds no logo or icon in the markup", () => {
    const s = extractBranding(html, css, "https://www.my105.ch/");
    expect(s.logo).toBeUndefined();
    expect(s.icons).toEqual([]);
  });
  it("lets the icon's colours win over a UI library's", () => {
    const s = extractBranding(html, css, "https://www.my105.ch/", null, { vivid: ["#e3e42b"], background: "#000000", dark: "#000000" });
    expect(s.colors.primary).toBe("#e3e42b");
    expect(s.mode).toBe("dark");
    expect(s.colors.background).toBe("#000000");
    expect(s.colors.text).toBe("#f5f5f5");
  });
});

describe("paletteFromPixels on an icon with a coloured plate", () => {
  it("takes the plate as the brand colour", () => {
    const w = 12;
    const px = new Uint8Array(w * w * 4);
    for (let i = 0; i < w * w; i++) px.set(i % w > 4 && i % w < 7 ? [255, 255, 255, 255] : [83, 58, 253, 255], i * 4);
    const p = paletteFromPixels(px, w, w);
    expect(p.vivid[0]).toBe("#533afd");
    expect(p.dark).toBeUndefined();
  });
});

it("decodes &amp; in icon addresses", () => {
  expect(extractBranding('<link rel="apple-touch-icon" href="/i.png?w=180&amp;h=180">', "", "https://x.ch/").favicon).toBe("https://x.ch/i.png?w=180&h=180");
});
