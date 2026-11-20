import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, legalDoc } from "./docs";
import { renderHelpMarkdown } from "@/lib/help/markdown";

describe("legal texts", () => {
  it("exist in both languages with a title, body and the operator", () => {
    for (const locale of ["de", "en"] as const) {
      for (const doc of LEGAL_DOCS) {
        const { title, body } = legalDoc(locale, doc);
        expect(title.length, `${locale}/${doc}`).toBeGreaterThan(3);
        expect(body.length, `${locale}/${doc}`).toBeGreaterThan(400);
        expect(body, `${locale}/${doc}`).toContain("my105 GmbH");
        expect(renderHelpMarkdown(body).html).not.toContain("${");
      }
    }
  });

  it("keep the same section structure in German and English", () => {
    for (const doc of LEGAL_DOCS) {
      const count = (locale: "de" | "en") => renderHelpMarkdown(legalDoc(locale, doc).body).toc.filter((h) => h.level === 2).length;
      expect(count("en"), doc).toBe(count("de"));
    }
  });
});
