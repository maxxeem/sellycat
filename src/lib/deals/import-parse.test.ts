import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blocksToDoc, hasContent, parseFetchedText, parseProductPage } from "./import-parse";

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
<img src="/icons/star.svg"><img class=x src="https://cdn.spa.ch/c.jpg?width=100&amp;format=webp"><footer>Impressum</footer></body></html>`;

describe("parseProductPage", () => {
  const f = parseProductPage(html, "https://www.spa.ch/angebote/wellness");
  it("reads title, description and the schema.org product", () => {
    expect(f.title).toBe("Wellness-Tag für zwei");
    expect(f.description).toBe("Entspannen an der Aare & mehr.");
    expect(f.product).toEqual({ name: "Wellness-Tag", description: "Sauna, Pool & Massage", price: "189", currency: "CHF" });
  });
  it("collects absolute product images, best srcset entry, without logos and icons", () => {
    expect(f.images).toEqual(["https://cdn.spa.ch/a.jpg", "https://cdn.spa.ch/b.jpg", "https://www.spa.ch/img/spa-hero.jpg", "https://www.spa.ch/s-1200.jpg", "https://cdn.spa.ch/c.jpg?width=100&format=webp"]);
  });
  it("keeps readable text, drops scripts, styles, header and footer", () => {
    expect(f.text).toContain("Ein ganzer Tag im Spa.");
    expect(f.text).toContain("Sauna");
    expect(f.text).not.toContain("not text");
    expect(f.text).not.toContain("Impressum");
  });
});

describe("parseProductPage on a saved Brack product page (ProductGroup with variants)", () => {
  const html = readFileSync(new URL("./__fixtures__/brack-product.html", import.meta.url), "utf8");
  const f = parseProductPage(html, "https://www.brack.ch/take-2-grand-theft-auto-vi-code-in-a-box-2178241");
  it("takes name, description and the variant's offer", () => {
    expect(f.product?.name).toBe("Grand Theft Auto VI (Code in a Box)");
    expect(f.product?.description).toContain("Vice City");
    expect(f.product).toMatchObject({ price: "72.90", currency: "CHF" });
    expect(hasContent(f)).toBe(true);
  });
  it("collects the variant's product photos first", () => {
    expect(f.images[0]).toBe("https://assets.brack.ch/images2/5/4/0/435511045/435511045_xl3.jpg");
    expect(f.images.length).toBeGreaterThan(5);
    expect(f.images.some((u) => /logo|\.svg/i.test(u))).toBe(false);
  });
});

describe("parseProductPage without JSON-LD", () => {
  it("reads the price from meta tags or microdata", () => {
    expect(parseProductPage('<meta property="product:price:amount" content="49.00"><meta property="product:price:currency" content="CHF">', "https://x.ch").product).toEqual({ name: null, description: null, price: "49.00", currency: "CHF" });
    expect(parseProductPage('<span itemprop="price" content="12.5">12.50</span><meta itemprop="priceCurrency" content="EUR">', "https://x.ch").product?.price).toBe("12.5");
  });
  it("treats an empty JavaScript shell as no content", () => {
    expect(hasContent(parseProductPage('<html><head><title>Shop</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>', "https://x.ch"))).toBe(false);
  });
});

describe("parseFetchedText (Claude's web fetch)", () => {
  const raw = `---
canonical: https://www.brack.ch/p-1
meta-description: Erlebe packende Action. Jetzt online kaufen.
meta-og:image: https://assets.brack.ch/images2/a_xxl.jpg
meta-og:title: Grand Theft Auto VI - BRACK
title: Grand Theft Auto VI
---

[Kontakt](https://www.brack.ch/kontakt)

[![Brack Logo](https://assets.brack.ch/img/logos/main.svg)](https://www.brack.ch/)

# Grand Theft Auto VI (Code in a Box)

![Produktbild](/images2/b_xl3.jpg)

Vice City, USA. Für Jason und Lucia war schon immer klar, dass sie im Leben schlechte Karten haben.
CHF 72.90`;
  const f = parseFetchedText(raw, "https://www.brack.ch/p-1");
  it("reads front matter, text and images", () => {
    expect(f.title).toBe("Grand Theft Auto VI - BRACK");
    expect(f.description).toBe("Erlebe packende Action. Jetzt online kaufen.");
    expect(f.images).toEqual(["https://assets.brack.ch/images2/a_xxl.jpg", "https://www.brack.ch/images2/b_xl3.jpg"]);
    expect(f.text).toContain("Kontakt");
    expect(f.text).not.toContain("](");
    expect(f.text).toContain("CHF 72.90");
    expect(hasContent(f)).toBe(true);
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
