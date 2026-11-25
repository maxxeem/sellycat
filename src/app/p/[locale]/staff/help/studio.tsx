"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Badge, Card, Field, Input, Notice, Select, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { HELP_CATEGORIES } from "@/lib/help/categories";
import { renderHelpMarkdown } from "@/lib/help/markdown";
import { createArticle, deleteArticle, discardDraft, move, publish, restoreVersion, saveDraft, updateMeta, uploadImage, type HelpResult } from "./actions";

type Version = { locale: string; title: string; body: string; draft_title: string | null; draft_body: string | null; draft_updated_at: string | null; published_at: string | null };
export type StudioArticle = { id: string; slug: string; category: string; sort_order: number; status: string; help_article_versions: Version[] };
type History = { id: string; locale: string; title: string; created_at: string };

export function HelpStudio(props: {
  articles: StudioArticle[];
  selected: string | null;
  history: History[];
  votes: Record<string, { yes: number; no: number }>;
  comments: { comment: string; locale: string; at: string }[];
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const s = t.staff.help;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [creating, setCreating] = useState({ slug: "", category: "getting-started", title: "" });
  const current = props.articles.find((a) => a.id === props.selected) ?? null;

  const run = (fn: () => Promise<HelpResult>, ok: string, after?: (r: HelpResult) => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.ok ? { tone: "success", text: ok } : { tone: "error", text: r.error === "slugTaken" ? s.slugTaken : r.error === "invalid" ? s.invalid : s.failed });
      after?.(r);
      router.refresh();
    });

  const titleOf = (a: StudioArticle) => {
    const de = a.help_article_versions.find((v) => v.locale === "de");
    return de?.title || de?.draft_title || a.slug;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card title={s.newArticle}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createArticle(creating), s.saved, (r) => {
                if (r.ok && r.id) {
                  setCreating({ slug: "", category: creating.category, title: "" });
                  router.push(`/admin/help?a=${r.id}`);
                }
              });
            }}
          >
            <Field label={s.titleField}>
              <Input value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value, slug: creating.slug || "" })} required />
            </Field>
            <Field label={s.slug}>
              <Input value={creating.slug} onChange={(e) => setCreating({ ...creating, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} required pattern="[a-z0-9-]+" />
            </Field>
            <Field label={s.category}>
              <Select value={creating.category} onChange={(e) => setCreating({ ...creating, category: e.target.value })}>
                {HELP_CATEGORIES.map((c) => <option key={c} value={c}>{t.help.categories[c].title}</option>)}
              </Select>
            </Field>
            <button type="submit" disabled={pending} className={buttonClass.secondary}>{s.create}</button>
          </form>
        </Card>
        <nav className="flex flex-col gap-4">
          {HELP_CATEGORIES.map((c) => {
            const list = props.articles.filter((a) => a.category === c);
            return (
              <div key={c}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t.help.categories[c].title}</p>
                <ul className="flex flex-col">
                  {list.map((a) => {
                    const v = props.votes[a.id];
                    const draft = a.help_article_versions.some((x) => x.draft_title != null);
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/admin/help?a=${a.id}`}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${a.id === props.selected ? "bg-accent/10 font-semibold" : "hover:bg-surface-2"} ${a.status === "archived" ? "opacity-50" : ""}`}
                        >
                          <span className="min-w-0 flex-1 truncate">{titleOf(a)}</span>
                          {draft ? <span className="h-2 w-2 shrink-0 rounded-full bg-warn" title={s.draft} /> : null}
                          {v ? <span className="shrink-0 text-xs tabular-nums text-muted">{v.yes}/{v.yes + v.no}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                  {!list.length ? <li className="px-2 text-xs text-muted">–</li> : null}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        {current ? (
          <>
            <Meta key={current.id} article={current} pending={pending} run={run} canDelete={props.canDelete} votes={props.votes[current.id]} />
            {(["de", "en"] as const).map((locale) => (
              <Editor key={editorKey(current, locale)} article={current} locale={locale} pending={pending} run={run} />
            ))}
            <Card title={s.history}>
              {props.history.length ? (
                <ul className="flex flex-col divide-y divide-line text-sm">
                  {props.history.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-2">
                      <Badge>{h.locale.toUpperCase()}</Badge>
                      <span className="min-w-0 flex-1 truncate">{h.title}</span>
                      <span className="text-xs text-muted">{new Date(h.created_at).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })}</span>
                      <button type="button" className="text-sm font-medium text-accent-text hover:underline" disabled={pending} onClick={() => run(() => restoreVersion(h.id), s.saved)}>
                        {s.restore}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{s.noHistory}</p>
              )}
            </Card>
            {props.comments.length ? (
              <Card title={s.comments}>
                <ul className="flex flex-col gap-2 text-sm">
                  {props.comments.map((c, i) => (
                    <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">
                      <span className="mr-2 text-xs text-muted">{c.locale.toUpperCase()} · {new Date(c.at).toLocaleDateString("de-CH")}</span>
                      {c.comment}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** New server state (saved, published, restored) remounts the editor with it. */
function editorKey(a: StudioArticle, locale: string) {
  const v = a.help_article_versions.find((x) => x.locale === locale);
  return `${a.id}-${locale}-${v?.draft_updated_at ?? ""}-${v?.published_at ?? ""}-${v?.draft_title == null ? "live" : "draft"}`;
}

type Run = (fn: () => Promise<HelpResult>, ok: string, after?: (r: HelpResult) => void) => void;

function Meta({ article, pending, run, canDelete, votes }: { article: StudioArticle; pending: boolean; run: Run; canDelete: boolean; votes?: { yes: number; no: number } }) {
  const { t } = useI18n();
  const s = t.staff.help;
  const router = useRouter();
  const [slug, setSlug] = useState(article.slug);
  const [category, setCategory] = useState(article.category);
  const archived = article.status === "archived";
  return (
    <Card
      title={article.slug}
      description={votes ? fmt(s.votes, { yes: votes.yes, no: votes.no }) : undefined}
      actions={
        <div className="flex flex-wrap gap-2">
          {!archived ? (
            <a href={`/help/${article.category}/${article.slug}`} target="_blank" rel="noopener" className={buttonClass.secondary}>{s.view}</a>
          ) : null}
          <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => run(() => move(article.id, -1), s.saved)} aria-label={s.up}>↑</button>
          <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => run(() => move(article.id, 1), s.saved)} aria-label={s.down}>↓</button>
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label={s.slug}>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
        </Field>
        <Field label={s.category}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {HELP_CATEGORIES.map((c) => <option key={c} value={c}>{t.help.categories[c].title}</option>)}
          </Select>
        </Field>
        <button type="button" className={buttonClass.secondary} disabled={pending || (slug === article.slug && category === article.category)} onClick={() => run(() => updateMeta(article.id, { slug, category }), s.saved)}>
          {t.staff.support.save}
        </button>
        <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => run(() => updateMeta(article.id, { status: archived ? "published" : "archived" }), s.saved)}>
          {archived ? s.unarchive : s.archive}
        </button>
        {canDelete ? (
          <button
            type="button"
            className={`${buttonClass.secondary} text-danger`}
            disabled={pending}
            onClick={() => {
              if (confirm(s.removeConfirm)) run(() => deleteArticle(article.id), s.saved, () => router.push("/admin/help"));
            }}
          >
            {s.remove}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function Editor({ article, locale, pending, run }: { article: StudioArticle; locale: "de" | "en"; pending: boolean; run: Run }) {
  const { t } = useI18n();
  const s = t.staff.help;
  const v = article.help_article_versions.find((x) => x.locale === locale);
  const hasDraft = v?.draft_title != null;
  const startTitle = hasDraft ? v!.draft_title! : (v?.title ?? "");
  const startBody = hasDraft ? (v!.draft_body ?? "") : (v?.body ?? "");
  const [title, setTitle] = useState(startTitle);
  const [body, setBody] = useState(startBody);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = title !== startTitle || body !== startBody;
  const html = useMemo(() => (preview ? renderHelpMarkdown(body).html : ""), [preview, body]);

  const insert = (text: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : body.length;
    setBody(`${body.slice(0, at)}${text}${body.slice(at)}`);
  };

  return (
    <Card
      title={locale === "de" ? "Deutsch" : "English"}
      description={dirty ? s.unsaved : hasDraft ? s.draft : v?.title ? `${s.live} · ${new Date(v.published_at ?? "").toLocaleDateString("de-CH")}` : s.notLive}
      actions={
        <button type="button" className="text-sm font-medium text-accent-text hover:underline" onClick={() => setPreview((p) => !p)}>
          {s.preview}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label={s.titleField}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        {preview ? (
          <div className="help-prose rounded-xl border border-line bg-surface-2 p-4" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <Field label={s.body}>
            <textarea ref={area} rows={18} className={`${inputClass} h-auto py-3 font-mono text-sm`} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClass.secondary} disabled={pending || !dirty} onClick={() => run(() => saveDraft(article.id, locale, title, body), s.saved)}>
            {s.saveDraft}
          </button>
          <button
            type="button"
            className={buttonClass.primary}
            disabled={pending || !title.trim() || (!dirty && !hasDraft)}
            onClick={() =>
              run(async () => {
                if (dirty) {
                  const r = await saveDraft(article.id, locale, title, body);
                  if (!r.ok) return r;
                }
                return publish(article.id, locale);
              }, s.published)
            }
          >
            {s.publish}
          </button>
          {hasDraft ? (
            <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => run(() => discardDraft(article.id, locale), s.saved)}>
              {s.discard}
            </button>
          ) : null}
          <label className={`${buttonClass.secondary} ml-auto cursor-pointer`}>
            {uploading ? "…" : s.upload}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setUploading(true);
                const fd = new FormData();
                fd.set("file", f);
                const r = await uploadImage(fd);
                setUploading(false);
                if (r.ok && r.url) insert(`\n![${f.name.replace(/\.[a-z]+$/i, "")}](${r.url})\n`);
              }}
            />
          </label>
        </div>
      </div>
    </Card>
  );
}
