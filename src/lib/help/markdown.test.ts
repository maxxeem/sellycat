import { describe, expect, it } from "vitest";
import { excerpt, renderHelpMarkdown, safeSnippet, slugifyHeading } from "./markdown";

describe("help markdown", () => {
  it("renders headings with a table of contents", () => {
    const { html, toc } = renderHelpMarkdown("## Gutschein einlösen\n\nText\n\n### Mit der Kamera\n\n## Gutschein einlösen");
    expect(toc).toEqual([
      { id: "gutschein-einloesen", text: "Gutschein einlösen", level: 2 },
      { id: "mit-der-kamera", text: "Mit der Kamera", level: 3 },
      { id: "gutschein-einloesen-2", text: "Gutschein einlösen", level: 2 },
    ]);
    expect(html).toContain('<h2 id="gutschein-einloesen">');
  });

  it("renders lists, bold, code, callouts and links", () => {
    const { html } = renderHelpMarkdown("1. **Deals** öffnen\n2. `Neu` klicken\n- Punkt\n\n> Hinweis: wichtig\n\n[Hilfe](/help) und [X](https://x.ch)");
    expect(html).toContain("<ol><li><strong>Deals</strong> öffnen</li><li><code>Neu</code> klicken</li></ol>\n<ul><li>Punkt</li></ul>");
    expect(html).toContain('<aside class="callout">Hinweis: wichtig</aside>');
    expect(html).toContain('<a href="/help">Hilfe</a>');
    expect(html).toContain('target="_blank" rel="noopener"');
  });

  it("escapes HTML and refuses unsafe links and images", () => {
    const { html } = renderHelpMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![a](http://insecure.ch/a.png)\n\n![b](https://ok.ch/b.png)');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript');
    expect(html).not.toContain("insecure");
    expect(html).toContain('<img src="https://ok.ch/b.png" alt="b"');
  });

  it("makes excerpts, heading ids and safe snippets", () => {
    expect(excerpt("## Titel\n\nErster **Absatz** mit [Link](/x).\n\nZweiter")).toBe("Erster Absatz mit Link.");
    expect(slugifyHeading("Über Zahlungen!")).toBe("ueber-zahlungen");
    expect(safeSnippet("ein <mark>Treffer</mark> <b>x</b>")).toBe("ein <mark>Treffer</mark> &lt;b&gt;x&lt;/b&gt;");
    expect(safeSnippet("zurück. > Hinweis: **Bestellungen** - Punkt [Link](/x)")).toBe("zurück. Hinweis: Bestellungen Punkt Link");
  });
});
