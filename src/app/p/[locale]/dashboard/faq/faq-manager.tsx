"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, EmptyState, Field, Input, Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { FAQ_A_MAX, FAQ_Q_MAX } from "@/lib/shop/faq-library";
import { deleteFaq, saveFaq } from "./actions";

type Entry = { id: string; q: string; a: string };

/** General questions and answers of the shop; one entry is open at a time. */
export function FaqManager({ entries }: { entries: Entry[] }) {
  const { t } = useI18n();
  const f = t.faqLibrary;
  const router = useRouter();
  // "new" = the empty form, an id = that entry.
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ q: "", a: "" });
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const edit = (e: Entry | null) => {
    setError(null);
    setDraft(e ? { q: e.q, a: e.a } : { q: "", a: "" });
    setOpen(e ? e.id : "new");
  };
  const save = () =>
    start(async () => {
      const r = await saveFaq(open === "new" ? null : open, draft.q, draft.a);
      if (!r.ok) return setError(f.errors[r.error]);
      setOpen(null);
      router.refresh();
    });
  const remove = (e: Entry) => {
    if (!window.confirm(fmt(f.deleteConfirm, { question: e.q }))) return;
    start(async () => {
      const r = await deleteFaq(e.id);
      if (!r.ok) setError(f.errors[r.error]);
      router.refresh();
    });
  };
  const shown = entries.filter((e) => !query.trim() || `${e.q} ${e.a}`.toLowerCase().includes(query.trim().toLowerCase()));

  const form = (
    <div className="flex flex-col gap-4" data-testid="faq-form">
      <Field label={f.question}>
        <Input value={draft.q} maxLength={FAQ_Q_MAX} autoFocus onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} />
      </Field>
      <Field label={f.answer}>
        <textarea value={draft.a} maxLength={FAQ_A_MAX} rows={4} className={inputClass} onChange={(e) => setDraft((d) => ({ ...d, a: e.target.value }))} />
      </Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-2">
        <button type="button" className={buttonClass.primary} disabled={pending || !draft.q.trim() || !draft.a.trim()} onClick={save}>{pending ? "…" : t.common.save}</button>
        <button type="button" className={buttonClass.ghost} disabled={pending} onClick={() => setOpen(null)}>{t.common.cancel}</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass.primary} onClick={() => edit(null)} data-testid="faq-new"><Plus className="h-4 w-4" aria-hidden /> {f.add}</button>
        {entries.length > 5 ? <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.deals.reuseSearch} className="max-w-xs" /> : null}
      </div>
      {open === "new" ? <Card>{form}</Card> : null}
      {error && open === null ? <Notice tone="error">{error}</Notice> : null}
      {!entries.length && open !== "new" ? <EmptyState title={f.empty} description={f.emptyHint} /> : null}
      {shown.length ? (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface-2 shadow-card">
          {shown.map((e) => (
            <li key={e.id} className="p-4 sm:p-5" data-testid="faq-entry">
              {open === e.id ? (
                form
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">{e.q}</p>
                    <p className="mt-1 whitespace-pre-line text-muted">{e.a}</p>
                  </div>
                  <button type="button" className="rounded-input p-2 text-muted hover:bg-surface hover:text-ink" aria-label={`${f.edit}: ${e.q}`} onClick={() => edit(e)}><Pencil className="h-4 w-4" aria-hidden /></button>
                  <button type="button" className="rounded-input p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`${t.design.remove}: ${e.q}`} disabled={pending} onClick={() => remove(e)}><Trash2 className="h-4 w-4" aria-hidden /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
