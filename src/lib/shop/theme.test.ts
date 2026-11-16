import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/color";
import { DEFAULT_THEME, contrastIssues, headerLook, parseTheme, themeFontCss, themeVars } from "./theme";

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

describe("header look", () => {
  it("is transparent with the page's text colour by default", () => {
    const t = parseTheme({});
    expect(headerLook(t)).toEqual({ background: "transparent", text: t.colors.text, tone: "light" });
  });
  it("uses a readable text colour on a colour or gradient", () => {
    expect(headerLook(parseTheme({ header: { fill: "color", from: "#0b3d25" } }))).toMatchObject({ background: "#0b3d25", text: "#ffffff", tone: "dark" });
    const g = headerLook(parseTheme({ header: { fill: "gradient", from: "#fff3b0", to: "#ffd166", direction: "right" } }));
    expect(g.background).toBe("linear-gradient(90deg, #fff3b0, #ffd166)");
    expect(g.tone).toBe("light");
  });
});
