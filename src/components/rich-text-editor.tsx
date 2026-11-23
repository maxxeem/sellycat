"use client";

import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Quote, Underline } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";
import { RICH_TEXT_EXTENSIONS } from "@/lib/shop/rich-text";

/**
 * Small rich text editor (Tiptap) with only the formatting the shop can render. `tools`: the full
 * set for deal descriptions, or the simple one for legal texts (bold, italic, underline, lists, links).
 */
export function RichTextEditor({
  value,
  onChange,
  label,
  tools = "full",
  minHeight = "min-h-40",
  stickyToolbar,
}: {
  value: JSONContent | null;
  onChange: (doc: JSONContent) => void;
  label: string;
  tools?: "full" | "simple";
  minHeight?: string;
  /** Keep the toolbar in view while scrolling through a long text: the `top-*` classes (below any sticky page bar). */
  stickyToolbar?: string;
}) {
  const { t } = useI18n();
  const r = t.richText;
  const editor = useEditor({
    extensions: RICH_TEXT_EXTENSIONS,
    content: value ?? "",
    immediatelyRender: false,
    editorProps: { attributes: { class: `editor-prose ${minHeight} px-3 py-2 outline-none`, "aria-label": label } },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
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
      <div className={`flex flex-wrap gap-0.5 rounded-t-input border-b border-line bg-surface-2 p-1 ${stickyToolbar ? `sticky z-20 ${stickyToolbar}` : ""}`} role="toolbar" aria-label={label}>
        {btn(state?.bold, () => c()?.toggleBold().run(), <Bold className="h-4 w-4" />, r.bold)}
        {btn(state?.italic, () => c()?.toggleItalic().run(), <Italic className="h-4 w-4" />, r.italic)}
        {tools === "simple" ? btn(state?.underline, () => c()?.toggleUnderline().run(), <Underline className="h-4 w-4" />, r.underline) : null}
        {tools === "full" ? btn(state?.h2, () => c()?.toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, "H2") : null}
        {tools === "full" ? btn(state?.h3, () => c()?.toggleHeading({ level: 3 }).run(), <Heading3 className="h-4 w-4" />, "H3") : null}
        {btn(state?.bullet, () => c()?.toggleBulletList().run(), <List className="h-4 w-4" />, r.bullets)}
        {btn(state?.ordered, () => c()?.toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, r.numbered)}
        {tools === "full" ? btn(state?.quote, () => c()?.toggleBlockquote().run(), <Quote className="h-4 w-4" />, r.quote) : null}
        {btn(
              state?.link,
              () => {
                if (editor?.isActive("link")) return c()?.unsetLink().run();
                const href = window.prompt(r.linkPrompt, "https://");
                if (href && /^(https?:|mailto:|tel:)/i.test(href)) c()?.setLink({ href }).run();
              },
              <LinkIcon className="h-4 w-4" />,
              r.link,
            )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
