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
  it("shows the logo made for the footer background", () => {
    const light = html({ ...logos, colors: { ...logos.colors, surface: "#f5f5f5" } });
    const dark = html({ ...logos, colors: { ...logos.colors, surface: "#1c1c1c" } });
    const footerImg = (h: string) => h.match(/<img[^>]*data-testid="shop-footer-logo"[^>]*>/)?.[0] ?? "";
    expect(footerImg(light)).toContain("light.png");
    expect(footerImg(dark)).toContain("dark.png");
  });

  it("falls back to the shop name without a logo", () => {
    expect(html(DEFAULT_THEME)).not.toContain("shop-footer-logo");
    expect(html(DEFAULT_THEME)).toContain(">my105</p>");
  });

  it("fills the screen so the footer sits at the bottom (previews fill their box)", () => {
    expect(html(DEFAULT_THEME)).toContain("min-h-dvh");
    expect(html(DEFAULT_THEME, true)).toContain("min-h-full");
  });
});
