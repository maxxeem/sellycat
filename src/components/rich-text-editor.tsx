"use client";

import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Quote } from "lucide-react";
import type { ReactNode } from "react";
import { RICH_TEXT_EXTENSIONS } from "@/lib/shop/rich-text";

/** Small rich text editor (Tiptap) with only the formatting the shop can render. */
export function RichTextEditor({ value, onChange, label }: { value: JSONContent | null; onChange: (doc: JSONContent) => void; label: string }) {
  const editor = useEditor({
    extensions: RICH_TEXT_EXTENSIONS,
    content: value ?? "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "editor-prose min-h-40 px-3 py-2 outline-none", "aria-label": label } },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });
  const btn = (active: boolean | undefined, onClick: () => void, icon: ReactNode, title: string) => (
    <button type="button" title={title} aria-label={title} aria-pressed={Boolean(active)} onClick={onClick} className={`rounded p-1.5 ${active ? "bg-ink text-surface-2" : "text-muted hover:bg-surface hover:text-ink"}`}>
      {icon}
    </button>
  );
  const c = () => editor?.chain().focus();
  return (
    <div className="rounded-input border border-line bg-surface-2 focus-within:border-ink">
      <div className="flex flex-wrap gap-0.5 border-b border-line p-1" role="toolbar" aria-label={label}>
        {btn(state?.bold, () => c()?.toggleBold().run(), <Bold className="h-4 w-4" />, "Bold")}
        {btn(state?.italic, () => c()?.toggleItalic().run(), <Italic className="h-4 w-4" />, "Italic")}
        {btn(state?.h2, () => c()?.toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, "H2")}
        {btn(state?.h3, () => c()?.toggleHeading({ level: 3 }).run(), <Heading3 className="h-4 w-4" />, "H3")}
        {btn(state?.bullet, () => c()?.toggleBulletList().run(), <List className="h-4 w-4" />, "List")}
        {btn(state?.ordered, () => c()?.toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, "Numbered list")}
        {btn(state?.quote, () => c()?.toggleBlockquote().run(), <Quote className="h-4 w-4" />, "Quote")}
        {btn(
          state?.link,
          () => {
            if (editor?.isActive("link")) return c()?.unsetLink().run();
            const href = window.prompt("URL", "https://");
            if (href && /^(https?:|mailto:|tel:)/i.test(href)) c()?.setLink({ href }).run();
          },
          <LinkIcon className="h-4 w-4" />,
          "Link",
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
