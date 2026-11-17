import { describe, expect, it } from "vitest";
import { mergeTerms, reusableTexts, sameFaq } from "./reuse";

describe("reusableTexts", () => {
  it("collects distinct terms and FAQ entries with their deal", () => {
    const r = reusableTexts([
      { title: "Pizza", terms: "Nur am Abend.", faq: [{ q: "Takeaway?", a: "Ja." }, { q: "", a: "leer" }] },
      { title: "Kurs", terms: "  nur   am abend. ", faq: [{ q: "takeaway?", a: "ja." }, { q: "Wie lange?", a: "3 Stunden." }] },
      { title: "Alt", terms: null, faq: "kaputt" },
    ]);
    expect(r.terms).toEqual([{ text: "Nur am Abend.", from: "Pizza" }]);
    expect(r.faq).toEqual([
      { q: "Takeaway?", a: "Ja.", from: "Pizza" },
      { q: "Wie lange?", a: "3 Stunden.", from: "Kurs" },
    ]);
  });
});

describe("helpers", () => {
  it("merges terms", () => {
    expect(mergeTerms("", "Neu", "append")).toBe("Neu");
    expect(mergeTerms("Alt\n", "Neu", "append")).toBe("Alt\n\nNeu");
    expect(mergeTerms("Alt", "Neu", "replace")).toBe("Neu");
  });
  it("compares FAQ entries loosely", () => {
    expect(sameFaq({ q: "A ?", a: "b" }, { q: "a ?", a: " B " })).toBe(true);
  });
});
