import "server-only";
import { generateHTML } from "@tiptap/html";
import { RICH_TEXT_EXTENSIONS, isDoc } from "./rich-text";

/** Tiptap JSON → HTML on the server. Unknown content renders as nothing rather than failing the page. */
export function docToHtml(doc: unknown): string {
  if (!isDoc(doc) || !doc.content?.length) return "";
  try {
    return generateHTML(doc, RICH_TEXT_EXTENSIONS);
  } catch {
    return "";
  }
}
