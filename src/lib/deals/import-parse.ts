/**
 * AI deal import, step 1: what a product page offers (title, meta description, schema.org
 * Product data, readable text, image candidates). Pure and tested; no network.
 */
import type { JSONContent } from "@tiptap/core";

export type PageFacts = {
  url: string;
  title: string | null;
  description: string | null;
  product: { name: string | null; description: string | null; price: string | null; currency: string | null } | null;
  text: string;
  images: string[];
};

const MAX_TEXT = 24_000;
const MAX_IMAGES = 24;

const NAMED: Record<string, string> = { auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ss", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", euro: "€", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };

const decode = (s: string) =>
  s
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => NAMED[name] ?? m)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function meta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decode(content).trim() || null : null;
}

function absolute(src: string, base: string): string | null {
  try {
    const u = new URL(decode(src.trim()), base);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

type LdNode = Record<string, unknown>;

const PRODUCT_TYPES = ["Product", "ProductGroup", "IndividualProduct", "ProductModel", "Vehicle", "Book", "Event", "Offer", "Service", "TouristTrip", "FoodEstablishment", "Course"];
const typeOf = (n: unknown): string[] => {
  const t = (n as LdNode)?.["@type"];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string").map((x) => x.replace(/^.*[/#]/, ""));
};

/** Every node of every JSON-LD block (arrays, @graph and nested mainEntity/itemListElement). */
function ldNodes(html: string): LdNode[] {
  const out: LdNode[] = [];
  const visit = (v: unknown, depth: number) => {
    if (!v || typeof v !== "object" || depth > 4) return;
    if (Array.isArray(v)) return v.forEach((x) => visit(x, depth + 1));
    const node = v as LdNode;
    out.push(node);
    for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) visit(node[key], depth + 1);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(m[1].trim().replace(/^<!--|-->$/g, "")), 0);
    } catch {
      // Broken JSON-LD is common; ignore it.
    }
  }
  return out;
}

/**
 * The schema.org product: Product (or a kin type) from JSON-LD; a ProductGroup lends its first
 * variant's offer and images (shops like Brack describe the article that way).
 */
function ldProduct(html: string): LdNode | null {
  const nodes = ldNodes(html);
  const rank = (n: LdNode) => {
    const i = typeOf(n).map((t) => PRODUCT_TYPES.indexOf(t)).filter((x) => x >= 0);
    return i.length ? Math.min(...i) : -1;
  };
  const candidates = nodes.filter((n) => rank(n) >= 0 && typeof n.name === "string").sort((a, b) => rank(a) - rank(b));
  const node = candidates[0];
  if (!node) return null;
  const variant = asList(node.hasVariant).find((v) => typeof v === "object") as LdNode | undefined;
  if (!variant) return node;
  return { ...variant, ...node, offers: node.offers ?? variant.offers, image: node.image ?? variant.image, description: node.description ?? variant.description };
}

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v ? [v] : []);

/** Price and currency of the first offer (AggregateOffer → lowPrice, priceSpecification too). */
function offerPrice(node: LdNode | null): { price: string | null; currency: string | null } {
  for (const o of asList(node?.offers) as LdNode[]) {
    if (!o || typeof o !== "object") continue;
    const spec = asList(o.priceSpecification)[0] as LdNode | undefined;
    const price = o.price ?? o.lowPrice ?? spec?.price;
    const currency = o.priceCurrency ?? spec?.priceCurrency;
    if (price != null && String(price).trim()) return { price: String(price), currency: typeof currency === "string" ? currency : null };
  }
  return { price: null, currency: null };
}

/** Price from meta tags or microdata when there is no JSON-LD offer. */
function pagePrice(html: string): { price: string | null; currency: string | null } {
  const price = meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*itemprop=["']price["']/i)?.slice(1).find(Boolean) ?? null;
  const currency = meta(html, "product:price:currency") ?? meta(html, "og:price:currency") ?? html.match(/itemprop=["']priceCurrency["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*itemprop=["']priceCurrency["']/i)?.slice(1).find(Boolean) ?? null;
  return { price, currency };
}

const SKIP_IMAGE = /(sprite|icon|logo|favicon|pixel|tracking|placeholder|spinner|loader|badge|payment|flag)/i;

export function parseProductPage(html: string, pageUrl: string): PageFacts {
  const node = ldProduct(html);
  const ld = offerPrice(node);
  const fallback = ld.price ? ld : pagePrice(html);
  const product = node
    ? {
        name: typeof node.name === "string" ? decode(node.name) : null,
        description: typeof node.description === "string" ? decode(node.description).slice(0, 4000) : null,
        price: fallback.price,
        currency: fallback.currency,
      }
    : fallback.price
      ? { name: null, description: null, price: fallback.price, currency: fallback.currency }
      : null;

  const images: string[] = [];
  const add = (src: unknown) => {
    const u = typeof src === "string" ? absolute(src, pageUrl) : typeof (src as LdNode)?.url === "string" ? absolute((src as LdNode).url as string, pageUrl) : typeof (src as LdNode)?.contentUrl === "string" ? absolute((src as LdNode).contentUrl as string, pageUrl) : null;
    if (u && !images.includes(u) && !/\.(svg|gif)(\?|$)/i.test(u) && !SKIP_IMAGE.test(u)) images.push(u);
  };
  for (const i of asList(node?.image)) add(i);
  add(meta(html, "og:image"));
  add(meta(html, "og:image:secure_url"));
  add(meta(html, "twitter:image"));
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    // The width attribute only (not "?width=" inside an image address).
    const w = Number(tag.match(/\swidth=["']?(\d+)/i)?.[1] ?? 0);
    if (w && w < 200) continue;
    const srcset = tag.match(/\b(?:data-srcset|srcset)=["']([^"']+)["']/i)?.[1];
    const best = srcset?.split(/,\s+/).map((s) => s.trim().split(/\s+/)[0]).pop();
    add(best ?? tag.match(/\b(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i)?.[1]);
    if (images.length >= MAX_IMAGES) break;
  }

  // Readable text: the main content when the page marks it, else the whole body.
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0];
  const source = main && main.length > 2000 ? main : html;
  const body = source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr|dd|dt|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decode(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n")
    .slice(0, MAX_TEXT);

  return {
    url: pageUrl,
    title: meta(html, "og:title") ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]).trim() : null),
    description: meta(html, "og:description") ?? meta(html, "description"),
    product,
    text,
    images: images.slice(0, MAX_IMAGES),
  };
}

/** The page has enough to write a deal from (a product, or some real text). */
export const hasContent = (f: PageFacts) => Boolean(f.product?.name) || f.text.length >= 200 || (Boolean(f.title) && f.text.length >= 80);

/**
 * The text Claude's web fetch returns (front matter with title and meta tags, then Markdown):
 * the same facts as from HTML, images from the share image and Markdown image links.
 */
export function parseFetchedText(raw: string, pageUrl: string): PageFacts {
  const front = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields = new Map<string, string>();
  for (const line of front?.[1].split("\n") ?? []) {
    const m = line.match(/^([\w:.-]+):\s*(.*)$/);
    if (m) fields.set(m[1].toLowerCase(), m[2].trim());
  }
  const body = front ? raw.slice(front[0].length) : raw;
  const images: string[] = [];
  const add = (src: string | undefined) => {
    const u = src ? absolute(src, pageUrl) : null;
    if (u && !images.includes(u) && !/\.(svg|gif)(\?|$)/i.test(u) && !SKIP_IMAGE.test(u)) images.push(u);
  };
  add(fields.get("meta-og:image"));
  add(fields.get("meta-twitter:image"));
  for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)) if (!SKIP_IMAGE.test(m[1])) add(m[2]);
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n")
    .slice(0, MAX_TEXT);
  const price = fields.get("meta-product:price:amount") ?? fields.get("meta-og:price:amount") ?? null;
  return {
    url: pageUrl,
    title: fields.get("meta-og:title") ?? fields.get("title") ?? null,
    description: fields.get("meta-og:description") ?? fields.get("meta-description") ?? null,
    product: price ? { name: null, description: null, price, currency: fields.get("meta-product:price:currency") ?? fields.get("meta-og:price:currency") ?? null } : null,
    text,
    images: images.slice(0, MAX_IMAGES),
  };
}

export type DraftBlock = { kind: "paragraph"; text: string } | { kind: "bullets"; items: string[] } | { kind: "heading"; text: string };

/** The AI's description blocks → the editor's rich text (paragraphs, bullet lists, level-3 headings). */
export function blocksToDoc(blocks: DraftBlock[]): JSONContent {
  const text = (t: string) => [{ type: "text", text: t.trim().slice(0, 2000) }];
  const content: JSONContent[] = [];
  for (const b of blocks.slice(0, 30)) {
    if (b.kind === "paragraph" && b.text.trim()) content.push({ type: "paragraph", content: text(b.text) });
    if (b.kind === "heading" && b.text.trim()) content.push({ type: "heading", attrs: { level: 3 }, content: text(b.text) });
    if (b.kind === "bullets" && b.items.some((i) => i.trim()))
      content.push({ type: "bulletList", content: b.items.filter((i) => i.trim()).slice(0, 12).map((i) => ({ type: "listItem", content: [{ type: "paragraph", content: text(i) }] })) });
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
