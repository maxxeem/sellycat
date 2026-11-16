import { describe, expect, it } from "vitest";
import { fontCssUrl, isSafeFontFile, isSafeFontQuery, rewriteFontCss } from "./font-proxy";

describe("font proxy", () => {
  it("builds the css url on our domain", () => {
    expect(fontCssUrl("family=Inter:wght@400&display=swap")).toBe("/api/fonts/css2?family=Inter:wght@400&display=swap");
  });
  it("accepts css2 queries and refuses anything else", () => {
    expect(isSafeFontQuery("family=Playfair+Display:ital,wght@0,400;1,700&display=swap")).toBe(true);
    expect(isSafeFontQuery("family=Inter%20Tight:wght@400&display=swap")).toBe(true);
    expect(isSafeFontQuery("")).toBe(false);
    expect(isSafeFontQuery("url=https://evil.example")).toBe(false);
    expect(isSafeFontQuery("family=a<script>")).toBe(false);
  });
  it("rewrites gstatic file urls to our file route", () => {
    expect(rewriteFontCss("src: url(https://fonts.gstatic.com/s/inter/v13/abc.woff2) format('woff2');")).toBe("src: url(/api/fonts/file/s/inter/v13/abc.woff2) format('woff2');");
  });
  it("only fetches font files, never other paths", () => {
    expect(isSafeFontFile("s/inter/v13/abc.woff2")).toBe(true);
    expect(isSafeFontFile("s/../../etc/passwd.woff2")).toBe(false);
    expect(isSafeFontFile("s/inter/v13/abc.js")).toBe(false);
  });
});
