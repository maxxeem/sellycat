import { describe, expect, it } from "vitest";
import { heroLook, parseTheme } from "./theme";

const pic = "https://example.com/a.jpg";
const phone = "https://example.com/m.jpg";

describe("hero background per device", () => {
  it("without any choice: the picture on both, the phone falls back to the desktop picture", () => {
    const t = parseTheme({ hero: { image: pic, focusX: 10, focusY: 20 } });
    expect(heroLook(t, "desktop")).toMatchObject({ kind: "image", url: pic, position: "10% 20%" });
    expect(heroLook(t, "mobile")).toMatchObject({ kind: "image", url: pic, position: "10% 20%" });
    expect(heroLook(parseTheme({ hero: { image: pic, imageMobile: phone } }), "mobile")).toMatchObject({ url: phone, position: "50% 50%" });
    expect(heroLook(parseTheme({}), "desktop").kind).toBe("plain");
  });

  it("colour, gradient or text only on one device", () => {
    const t = parseTheme({ hero: { image: pic, mobile: { kind: "gradient", from: "#111111", to: "#222222", direction: "down" } } });
    expect(heroLook(t, "desktop").kind).toBe("image");
    expect(heroLook(t, "mobile")).toMatchObject({ kind: "fill", background: "linear-gradient(180deg, #111111, #222222)", text: "#ffffff", tone: "dark" });
    expect(heroLook(parseTheme({ hero: { image: pic, mobile: { kind: "color", from: "#ffee00" } } }), "mobile")).toMatchObject({ background: "#ffee00", text: "#111111" });
    expect(heroLook(parseTheme({ hero: { image: pic, mobile: { kind: "none" } } }), "mobile").kind).toBe("plain");
  });

  it("themes saved with «only on …» keep the text on the other device", () => {
    const t = parseTheme({ hero: { image: pic, show: "desktop", title: "Hi" } });
    expect([heroLook(t, "desktop").kind, heroLook(t, "mobile").kind, t.hero.title]).toEqual(["image", "plain", "Hi"]);
    expect(heroLook(parseTheme({ hero: { image: pic, show: "mobile" } }), "desktop").kind).toBe("plain");
  });
});
