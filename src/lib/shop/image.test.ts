import { describe, expect, it } from "vitest";
import { shopImage } from "./image";

describe("shopImage", () => {
  it("routes storage pictures through the optimizer with a srcSet", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/shop-media/t/deals/a.jpg";
    const r = shopImage(url, "100vw");
    expect(r.src).toContain("/_next/image?url=");
    expect(r.srcSet).toContain("640w");
    expect(r.sizes).toBe("100vw");
  });

  it("leaves other sources alone", () => {
    expect(shopImage("blob:http://localhost/abc", "100vw")).toEqual({ src: "blob:http://localhost/abc" });
    expect(shopImage("https://example.com/a.jpg", "100vw")).toEqual({ src: "https://example.com/a.jpg" });
    const svg = "https://x.supabase.co/storage/v1/object/public/shop-media/t/theme/logo.svg";
    expect(shopImage(svg, "200px")).toEqual({ src: svg });
  });
});
