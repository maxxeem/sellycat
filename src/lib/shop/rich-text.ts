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
