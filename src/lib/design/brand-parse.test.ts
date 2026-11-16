import { describe, expect, it } from "vitest";
import { extractBranding } from "./brand-parse";

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
