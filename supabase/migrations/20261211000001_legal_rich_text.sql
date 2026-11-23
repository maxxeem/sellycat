-- Imprint, terms and privacy with simple formatting (bold, italic, underline, lists): the
-- document as Tiptap JSON in `content_doc`; `content` keeps the plain text (completeness check,
-- older readers). Pages without a document render their plain text as before.
alter table public.legal_pages add column if not exists content_doc jsonb;
comment on column public.legal_pages.content_doc is 'Tiptap JSON of the page (rendered with known nodes only); content = its plain text.';
