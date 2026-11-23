/**
 * Deal descriptions are Tiptap JSON. The same extension list is used by the editor (client) and
 * by the renderer (server: @tiptap/html), so only known nodes and marks can ever reach the page.
 */
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";

export const RICH_TEXT_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"], HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
  }),
];

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function isDoc(value: unknown): value is JSONContent {
  return Boolean(value && typeof value === "object" && (value as JSONContent).type === "doc");
}

/** Plain text of a document (meta descriptions, OG images, search). */
export function docToText(doc: unknown, max = 300): string {
  const out: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.text) out.push(n.text);
    n.content?.forEach(walk);
    if (n.type === "paragraph" || n.type === "heading" || n.type === "listItem") out.push(" ");
  };
  if (isDoc(doc)) walk(doc);
  const text = out.join("").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Plain text → document (seed data, imports). */
export function textToDoc(text: string): JSONContent {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return { type: "doc", content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) };
}

/** Plain text with line breaks → document: blank line = new paragraph, single line break kept. */
export function plainToDoc(text: string): JSONContent {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs.map((p) => ({ type: "paragraph", content: p.split("\n").flatMap((line, i) => [...(i ? [{ type: "hardBreak" }] : []), ...(line ? [{ type: "text", text: line }] : [])]) }))
      : [{ type: "paragraph" }],
  };
}

/** Document → plain text with its structure (paragraphs, line breaks, list items). */
export function docToPlain(doc: unknown): string {
  if (!isDoc(doc)) return "";
  const inline = (n: JSONContent): string => (n.type === "text" ? (n.text ?? "") : n.type === "hardBreak" ? "\n" : (n.content ?? []).map(inline).join(""));
  const block = (n: JSONContent, prefix = ""): string[] => {
    if (n.type === "bulletList" || n.type === "orderedList") {
      const start = typeof n.attrs?.start === "number" ? n.attrs.start : 1;
      return [(n.content ?? []).map((li, i) => block(li, n.type === "orderedList" ? `${start + i}. ` : "- ").join("\n")).join("\n")];
    }
    if (n.type === "listItem") return [(n.content ?? []).flatMap((c) => block(c)).map((t, i) => (i ? `  ${t}` : `${prefix}${t}`)).join("\n")];
    if (n.type === "blockquote") return (n.content ?? []).flatMap((c) => block(c));
    return [inline(n)];
  };
  return (doc.content ?? []).flatMap((n) => block(n)).map((t) => t.trim()).filter(Boolean).join("\n\n");
}
