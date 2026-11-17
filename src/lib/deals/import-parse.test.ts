import { describe, expect, it } from "vitest";
import { blocksToDoc, parseProductPage } from "./import-parse";

const html = `<!doctype html><html><head>
<title>Wellness-Tag | Spa Aare</title>
<meta property="og:title" content="Wellness-Tag f&uuml;r zwei">
<meta name="description" content="Entspannen an der Aare &amp; mehr.">
<meta property="og:image" content="/img/spa-hero.jpg">
<script type="application/ld+json">{"@graph":[{"@type":"Organization","name":"Spa"},{"@type":"Product","name":"Wellness-Tag","description":"Sauna, Pool &amp; Massage","image":["https://cdn.spa.ch/a.jpg",{"url":"https://cdn.spa.ch/b.jpg"}],"offers":{"price":189,"priceCurrency":"CHF"}}]}</script>
<script>var x = "<p>not text</p>";</script><style>.a{}</style>
</head><body><header>Menu</header>
<h1>Wellness-Tag</h1><p>Ein ganzer Tag im Spa.</p><ul><li>Sauna</li><li>Pool</li></ul>
<img src="/logo.png" width="120"><img src="https://cdn.spa.ch/a.jpg"><img srcset="/s-400.jpg 400w, /s-1200.jpg 1200w" src="/s-400.jpg">
<img src="/icons/star.svg"><footer>Impressum</footer></body></html>`;

describe("parseProductPage", () => {
  const f = parseProductPage(html, "https://www.spa.ch/angebote/wellness");
  it("reads title, description and the schema.org product", () => {
    expect(f.title).toBe("Wellness-Tag für zwei");
    expect(f.description).toBe("Entspannen an der Aare & mehr.");
    expect(f.product).toEqual({ name: "Wellness-Tag", description: "Sauna, Pool & Massage", price: "189", currency: "CHF" });
  });
  it("collects absolute product images, best srcset entry, without logos and icons", () => {
    expect(f.images).toEqual(["https://cdn.spa.ch/a.jpg", "https://cdn.spa.ch/b.jpg", "https://www.spa.ch/img/spa-hero.jpg", "https://www.spa.ch/s-1200.jpg"]);
  });
  it("keeps readable text, drops scripts, styles, header and footer", () => {
    expect(f.text).toContain("Ein ganzer Tag im Spa.");
    expect(f.text).toContain("Sauna");
    expect(f.text).not.toContain("not text");
    expect(f.text).not.toContain("Impressum");
  });
});

describe("blocksToDoc", () => {
  it("builds paragraphs, headings and bullet lists", () => {
    const doc = blocksToDoc([{ kind: "paragraph", text: "Hallo" }, { kind: "heading", text: "Inbegriffen" }, { kind: "bullets", items: ["Sauna", " ", "Pool"] }]);
    expect(doc.content?.map((n) => n.type)).toEqual(["paragraph", "heading", "bulletList"]);
    expect(doc.content?.[2].content).toHaveLength(2);
    expect(blocksToDoc([])).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});
