import { describe, expect, it } from "vitest";
import { docToHtml } from "./rich-text-server";
import { docToPlain, docToText, plainToDoc, textToDoc } from "./rich-text";

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

describe("legal text documents", () => {
  it("keeps paragraphs and single line breaks of plain text", () => {
    const doc = plainToDoc("my105 GmbH\nMusterstrasse 1\n\nKontakt: info@my105.ch");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[0]?.content?.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
    expect(docToPlain(doc)).toBe("my105 GmbH\nMusterstrasse 1\n\nKontakt: info@my105.ch");
  });

  it("writes lists as plain text and ignores formatting", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Fett", marks: [{ type: "bold" }] }, { type: "text", text: " und normal" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Eins" }] }] }, { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Zwei" }] }] }] },
        { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Erstens" }] }] }] },
      ],
    };
    expect(docToPlain(doc)).toBe("Fett und normal\n\n- Eins\n- Zwei\n\n1. Erstens");
  });

  it("underline and links render for legal pages", () => {
    const html = docToHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "u", marks: [{ type: "underline" }] }, { type: "text", text: "l", marks: [{ type: "link", attrs: { href: "https://my105.ch" } }] }] }] });
    expect(html).toContain("<u>u</u>");
    expect(html).toContain('href="https://my105.ch"');
  });

  it("an empty document has no text (so the legal check stays open)", () => {
    expect(docToPlain(plainToDoc(""))).toBe("");
    expect(docToPlain({ type: "doc", content: [{ type: "paragraph" }] })).toBe("");
    expect(docToPlain("nope")).toBe("");
  });
});
