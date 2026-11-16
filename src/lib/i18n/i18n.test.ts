import { describe, expect, it } from "vitest";
import { de } from "./dictionaries/de";
import { en } from "./dictionaries/en";
import { fmt } from "./index";
import { pickLocale, resolveLocale } from "./locales";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort();
}

describe("dictionaries", () => {
  it("de has exactly the keys of en", () => expect(keys(de)).toEqual(keys(en)));
  it("no German text uses ß (Swiss spelling)", () => expect(JSON.stringify(de)).not.toContain("ß"));
  it("always writes Sellycat with a small c", () => {
    for (const d of [de, en]) expect(JSON.stringify(d)).not.toMatch(/Selly[C]at|SELLYCAT/);
  });
});

describe("locale detection", () => {
  it("prefers the cookie", () => expect(resolveLocale("de", "en-US")).toBe("de"));
  it("falls back to Accept-Language", () => expect(resolveLocale(undefined, "de-CH,de;q=0.9,en;q=0.8")).toBe("de"));
  it("falls back to English", () => expect(pickLocale("fr-CH")).toBe("en"));
  it("respects q values", () => expect(pickLocale("en;q=0.5,de;q=0.9")).toBe("de"));
});

describe("fmt", () => {
  it("fills placeholders", () => expect(fmt("Hi {name}", { name: "Jan" })).toBe("Hi Jan"));
  it("leaves unknown placeholders", () => expect(fmt("{x}", {})).toBe("{x}"));
});
