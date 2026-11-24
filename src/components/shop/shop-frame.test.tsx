import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, type ShopTheme } from "@/lib/shop/theme";
import { ShopFrame } from "./shop-frame";
import { shopTexts } from "./shop-texts";

const t = shopTexts("de");
const html = (theme: ShopTheme, inert = false) =>
  renderToStaticMarkup(
    <ShopFrame name="my105" theme={theme} t={t} inert={inert}>
      <p>x</p>
    </ShopFrame>,
  );
const logos = { ...DEFAULT_THEME, logoLight: "https://example.supabase.co/storage/v1/object/public/a/light.png", logoDark: "https://example.supabase.co/storage/v1/object/public/a/dark.png" };

describe("ShopFrame footer", () => {
  it("shows the website and social media icons instead of a logo", () => {
    const h = html({ ...logos, socialLinks: [{ network: "website", url: "www.my105.ch" }, { network: "instagram", url: "@my105radio" }, { network: "linkedin", url: "not a link" }] });
    expect(h).not.toContain("shop-footer-logo");
    expect(h).toContain('href="https://www.my105.ch/"');
    expect(h).toContain('href="https://www.instagram.com/my105radio"');
    expect(h).not.toContain('aria-label="LinkedIn"');
  });

  it("shows the optional footer logo made for the footer background, above the icons", () => {
    const own = { ...logos, footerLogoLight: "https://example.com/f-light.png", footerLogoDark: "https://example.com/f-dark.png", socialLinks: [{ network: "website" as const, url: "my105.ch" }] };
    const img = (h: string) => h.match(/<img[^>]*data-testid="shop-footer-logo"[^>]*>/)?.[0] ?? "";
    const light = html({ ...own, colors: { ...own.colors, surface: "#f5f5f5" } });
    expect(img(light)).toContain("f-light.png");
    expect(img(html({ ...own, colors: { ...own.colors, surface: "#1c1c1c" } }))).toContain("f-dark.png");
    expect(img(html({ ...own, footerLogoDark: "", colors: { ...own.colors, surface: "#1c1c1c" } }))).toContain("f-light.png");
    expect(light.indexOf("shop-footer-logo")).toBeLessThan(light.indexOf("shop-social"));
  });

  it("shows no icon row without links, and the menus start on the left", () => {
    expect(html(DEFAULT_THEME)).not.toContain("shop-social");
    expect(html(DEFAULT_THEME)).toContain("lg:grid-cols-[1fr_1fr_1.4fr]");
    expect(html({ ...DEFAULT_THEME, socialLinks: [{ network: "website", url: "my105.ch" }] })).toContain("lg:grid-cols-[1.4fr_1fr_1fr]");
  });

  it("fills the screen so the footer sits at the bottom (previews fill their box)", () => {
    expect(html(DEFAULT_THEME)).toContain("min-h-dvh");
    expect(html(DEFAULT_THEME, true)).toContain("min-h-full");
  });
});
