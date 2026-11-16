import { describe, expect, it } from "vitest";
import { docToHtml } from "./rich-text-server";
import { docToText, textToDoc } from "./rich-text";

describe("rich text", () => {
  it("renders known nodes", () => {
    const html = docToHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Pizza", marks: [{ type: "bold" }] }] }] });
    expect(html).toBe("<p><strong>Pizza</strong></p>");
  });
  it("drops what the schema does not know (no raw HTML injection)", () => {
    const html = docToHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }] });
    expect(html).not.toContain("<script>");
  });
  it("blocks javascript: links", () => {
    const html = docToHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
    expect(html).not.toContain("javascript:");
  });
  it("extracts and builds plain text", () => {
    expect(docToText(textToDoc("Eins\n\nZwei"))).toBe("Eins Zwei");
    expect(docToText(textToDoc("x".repeat(400)), 10)).toHaveLength(10);
  });
});
