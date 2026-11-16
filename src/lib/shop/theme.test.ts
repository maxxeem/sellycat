import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/color";
import { DEFAULT_THEME, contrastIssues, parseTheme, themeFontCss, themeVars } from "./theme";

describe("theme", () => {
  it("fills defaults for empty and broken input", () => {
    expect(parseTheme(null)).toEqual(DEFAULT_THEME);
    const t = parseTheme({ colors: { primary: "nope" }, radius: 8 });
    expect(t.radius).toBe(8);
    expect(t.colors.primary).toBe(DEFAULT_THEME.colors.primary);
  });
  it("normalises colours", () => expect(parseTheme({ colors: { primary: "ABC" } }).colors.primary).toBe("#aabbcc"));
  it("picks readable button labels", () => {
    expect(themeVars(parseTheme({ colors: { primary: "#ffeb3b" } }))["--shop-on-primary"]).toBe("#111111");
    expect(themeVars(parseTheme({ colors: { primary: "#1e2a78" } }))["--shop-on-primary"]).toBe("#ffffff");
  });
  it("brand coral needs ink text (white is only ~3.3:1)", () => {
    expect(contrastRatio("#ffffff", "#ff4b23")).toBeLessThan(4.5);
    expect(themeVars(DEFAULT_THEME)["--shop-on-primary"]).toBe("#111111");
  });
  it("flags weak contrast", () => {
    expect(contrastIssues(DEFAULT_THEME)).toEqual([]);
    const issues = contrastIssues(parseTheme({ colors: { text: "#bbbbbb" } }));
    expect(issues.map((i) => i.pair)).toContain("text/background");
  });
  it("loads Google fonts through our proxy only", () => {
    const { links } = themeFontCss(parseTheme({ fonts: { heading: { source: "google", family: "Playfair Display" } } }));
    expect(links).toEqual(["/api/fonts/css2?family=Playfair+Display:wght@400;600;700&display=swap"]);
  });
});
