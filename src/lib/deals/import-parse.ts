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

/** schema.org Product from JSON-LD (also inside @graph). */
function ldProduct(html: string): { node: LdNode | null } {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim()) as unknown;
      const nodes: unknown[] = Array.isArray(data) ? data : [data, ...(((data as LdNode)?.["@graph"] as unknown[]) ?? [])];
      const product = nodes.find((n) => {
        const t = (n as LdNode)?.["@type"];
        return t === "Product" || (Array.isArray(t) && t.includes("Product"));
      });
      if (product) return { node: product as LdNode };
    } catch {
      // Broken JSON-LD is common; ignore it.
    }
  }
  return { node: null };
}

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v ? [v] : []);

export function parseProductPage(html: string, pageUrl: string): PageFacts {
  const { node } = ldProduct(html);
  const offer = node ? (asList(node.offers)[0] as LdNode | undefined) : undefined;
  const product = node
    ? {
        name: typeof node.name === "string" ? decode(node.name) : null,
        description: typeof node.description === "string" ? decode(node.description).slice(0, 4000) : null,
        price: offer?.price != null ? String(offer.price) : null,
        currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : null,
      }
    : null;

  const images: string[] = [];
  const add = (src: unknown) => {
    const u = typeof src === "string" ? absolute(src, pageUrl) : typeof (src as LdNode)?.url === "string" ? absolute((src as LdNode).url as string, pageUrl) : null;
    if (u && !images.includes(u) && !/\.(svg|gif)(\?|$)/i.test(u) && !/(sprite|icon|logo|favicon|pixel|tracking|placeholder)/i.test(u)) images.push(u);
  };
  for (const i of asList(node?.image)) add(i);
  add(meta(html, "og:image"));
  add(meta(html, "og:image:secure_url"));
  add(meta(html, "twitter:image"));
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
    if (w && w < 200) continue;
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    const best = srcset?.split(",").map((s) => s.trim().split(/\s+/)[0]).pop();
    add(best ?? tag.match(/\b(?:data-src|src)=["']([^"']+)["']/i)?.[1]);
    if (images.length >= MAX_IMAGES) break;
  }

  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr)>/gi, "\n")
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
