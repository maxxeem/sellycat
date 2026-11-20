/**
 * Markdown → HTML for help articles (no dependency, pure, unit-tested): ## / ### with ids for the
 * table of contents, paragraphs, numbered and bullet lists, **bold**, `code`, links, images on their
 * own line, callouts (`> Hinweis …`) and fenced code blocks (```). Everything else is escaped.
 */
export type TocEntry = { id: string; text: string; level: 2 | 3 };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "abschnitt"
  );
}

/** Links only to http(s), mailto, site paths and anchors. */
const SAFE_HREF = /^(https?:\/\/[^\s"<>]+|mailto:[^\s"<>]+|\/[^\s"<>]*|#[^\s"<>]*)$/;
const SAFE_SRC = /^(https:\/\/[^\s"<>]+|\/[^\s"<>]*)$/;

function inline(text: string): string {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, href: string) => {
    const raw = href.replace(/&amp;/g, "&");
    if (!SAFE_HREF.test(raw)) return m;
    return `<a href="${esc(raw)}"${raw.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  return out;
}

export function renderHelpMarkdown(source: string): { html: string; toc: TocEntry[] } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const toc: TocEntry[] = [];
  const ids = new Map<string, number>();
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.ordered ? "ol" : "ul"}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.ordered ? "ol" : "ul"}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<aside class="callout">${inline(quote.join(" "))}</aside>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };
  let code: string[] | null = null;
  for (const raw of lines) {
    if (code) {
      if (/^```\s*$/.test(raw.trim())) {
        html.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
        code = null;
      } else code.push(raw);
      continue;
    }
    if (/^```[\w-]*\s*$/.test(raw.trim())) {
      flushAll();
      code = [];
      continue;
    }
    const line = raw.trimEnd();
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const quoted = /^>\s?(.*)$/.exec(line);
    const image = /^!\[([^\]]*)\]\(([^\s)]+)\)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length as 2 | 3;
      const text = heading[2].trim();
      const base = slugifyHeading(text);
      const n = (ids.get(base) ?? 0) + 1;
      ids.set(base, n);
      const id = n > 1 ? `${base}-${n}` : base;
      toc.push({ id, text, level });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
    } else if (image) {
      flushAll();
      if (SAFE_SRC.test(image[2])) html.push(`<figure class="shot"><img src="${esc(image[2])}" alt="${esc(image[1])}" loading="lazy" decoding="async" /></figure>`);
    } else if (ordered || bullet) {
      flushParagraph();
      flushQuote();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((ordered ?? bullet)![1]);
    } else if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
    } else if (!line.trim()) {
      flushAll();
    } else if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      flushQuote();
      paragraph.push(line.trim());
    }
  }
  if (code) html.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
  flushAll();
  return { html: html.join("\n"), toc };
}

/** First paragraph as plain text (teaser in lists). */
export function excerpt(source: string, max = 160): string {
  const para = source.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).find((l) => l && !/^#|^!\[|^>|^[-*]\s|^\d+[.)]\s/.test(l)) ?? "";
  const plain = para.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

/** Search snippets come from Postgres with <mark> around hits: escape everything, keep only <mark>. */
export function safeSnippet(snippet: string): string {
  const plain = snippet
    .replace(/\*\*|`/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(^|\s)(#{2,3}|>|[-*]|\d+[.)])(?=\s)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return esc(plain).replace(/&lt;mark&gt;/g, "<mark>").replace(/&lt;\/mark&gt;/g, "</mark>");
}
