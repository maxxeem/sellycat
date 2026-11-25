import { describe, expect, it } from "vitest";
import { FAQ_LIBRARY_MAX, cleanFaq, newForLibrary } from "./faq-library";

describe("faq library", () => {
  it("cleans entries", () => {
    expect(cleanFaq({ q: " Wie? ", a: " So. " })).toEqual({ q: "Wie?", a: "So." });
    expect(cleanFaq({ q: "Wie?", a: " " })).toBeNull();
    expect(cleanFaq({ q: 1, a: "x" })).toBeNull();
  });
  it("takes only ticked, new entries, once", () => {
    const lib = [{ q: "Alt?", a: "Ja." }];
    expect(newForLibrary([{ q: "Neu?", a: "Ja.", keep: true }, { q: "neu? ", a: "ja.", keep: true }, { q: "Ohne?", a: "Nein." }, { q: "alt?", a: "ja.", keep: true }, { q: "", a: "x", keep: true }], lib)).toEqual([{ q: "Neu?", a: "Ja." }]);
    const full = Array.from({ length: FAQ_LIBRARY_MAX }, (_, i) => ({ q: `q${i}`, a: "a" }));
    expect(newForLibrary([{ q: "Neu?", a: "Ja.", keep: true }], full)).toEqual([]);
  });
});
