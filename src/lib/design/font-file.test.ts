import { describe, expect, it } from "vitest";
import { checkFontFile, familyFromFile, fontCssFormat, sniffFont } from "./font-file";

const bytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe("font files", () => {
  it("recognises the formats by their first bytes", () => {
    expect(sniffFont(bytes("wOF2"))).toBe("woff2");
    expect(sniffFont(bytes("wOFF"))).toBe("woff");
    expect(sniffFont(bytes("OTTO"))).toBe("otf");
    expect(sniffFont(new Uint8Array([0, 1, 0, 0]))).toBe("ttf");
    expect(sniffFont(bytes("%PDF"))).toBeNull();
  });

  it("takes woff2, woff, ttf and otf up to 5 MB, stored with the real format", () => {
    expect(checkFontFile("Brand.ttf", 1000, new Uint8Array([0, 1, 0, 0]))).toEqual({ ok: true, ext: "ttf", mime: "font/ttf" });
    expect(checkFontFile("Brand.woff2", 1000, bytes("wOF2"))).toEqual({ ok: true, ext: "woff2", mime: "font/woff2" });
    expect(checkFontFile("Brand.ttf", 1000, bytes("wOF2"))).toEqual({ ok: true, ext: "woff2", mime: "font/woff2" });
    expect(checkFontFile("Brand.zip", 1000, bytes("wOF2"))).toEqual({ ok: false, error: "type" });
    expect(checkFontFile("Brand.ttf", 1000, bytes("PK\u0003\u0004"))).toEqual({ ok: false, error: "type" });
    expect(checkFontFile("Brand.otf", 6 * 1024 * 1024, bytes("OTTO"))).toEqual({ ok: false, error: "size" });
  });

  it("names the family after the file and tells the browser the format", () => {
    expect(familyFromFile("My_Brand-Bold.ttf")).toBe("My Brand Bold");
    expect(fontCssFormat("https://x/a/b.ttf")).toBe("truetype");
    expect(fontCssFormat("https://x/a/b.otf")).toBe("opentype");
    expect(fontCssFormat("https://x/a/b.woff2")).toBe("woff2");
  });
});
