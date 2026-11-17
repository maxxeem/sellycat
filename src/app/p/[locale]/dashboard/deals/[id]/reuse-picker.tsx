"use client";

import { Check, History, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { sameFaq, type ReusableFaq, type ReusableTerms } from "@/lib/shop/reuse";

/** Small button next to a field label that opens the picker. */
export function ReuseButton({ onClick, count }: { onClick: () => void; count: number }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} disabled={!count} className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-xs font-semibold text-accent-text hover:bg-accent/10 disabled:opacity-40" data-testid="reuse-open">
      <History className="h-3.5 w-3.5" aria-hidden /> {t.deals.reuse}
      {count ? <span className="rounded-full bg-accent/15 px-1.5 text-[11px]">{count}</span> : null}
    </button>
  );
}

/** Dialog (bottom sheet on phones) with a search field. */
function Sheet({ title, onClose, children, footer, query, setQuery }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; query: string; setQuery: (q: string) => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-line bg-surface-2 shadow-pop sm:max-w-2xl sm:rounded-card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-input p-1.5 text-muted hover:bg-surface hover:text-ink" aria-label={t.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-line px-5 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.deals.reuseSearch} className={`${inputClass} pl-9`} autoFocus />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </div>
  );
}

const matches = (q: string, ...texts: string[]) => !q.trim() || texts.some((x) => x.toLowerCase().includes(q.trim().toLowerCase()));

/** Earlier conditions texts: take one over (replace or append when the field has text). */
export function TermsPicker({ items, current, onPick, onClose }: { items: ReusableTerms[]; current: string; onPick: (text: string, mode: "replace" | "append") => void; onClose: () => void }) {
  const { t } = useI18n();
  const d = t.deals;
  const [query, setQuery] = useState("");
  const shown = items.filter((i) => matches(query, i.text, i.from));
  const hasText = Boolean(current.trim());
  return (
    <Sheet title={d.reuseTermsTitle} onClose={onClose} query={query} setQuery={setQuery}>
      {!items.length ? <p className="py-6 text-center text-sm text-muted">{d.reuseEmpty}</p> : !shown.length ? <p className="py-6 text-center text-sm text-muted">{d.reuseNoMatch}</p> : null}
      <ul className="flex flex-col gap-3">
        {shown.map((item) => {
          const same = item.text.trim() === current.trim();
          return (
            <li key={item.text} className="rounded-input border border-line p-3">
              <p className="mb-1 text-xs font-semibold text-muted">{fmt(d.reuseFrom, { deal: item.from })}</p>
              <p className="line-clamp-4 whitespace-pre-line text-sm">{item.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {same ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden /> {d.reuseAlready}
                  </span>
                ) : hasText ? (
                  <>
                    <button type="button" className={`${buttonClass.secondary} h-8 px-3`} onClick={() => onPick(item.text, "replace")}>
                      {d.reuseReplace}
                    </button>
                    <button type="button" className={`${buttonClass.ghost} h-8 px-3`} onClick={() => onPick(item.text, "append")}>
                      {d.reuseAppend}
                    </button>
                  </>
                ) : (
                  <button type="button" className={`${buttonClass.secondary} h-8 px-3`} onClick={() => onPick(item.text, "replace")}>
                    {d.reuseUse}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Earlier questions: tick several and add them below the existing ones. */
export function FaqPicker({ items, current, onAdd, onClose }: { items: ReusableFaq[]; current: Array<{ q: string; a: string }>; onAdd: (entries: Array<{ q: string; a: string }>) => void; onClose: () => void }) {
  const { t } = useI18n();
  const d = t.deals;
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const shown = items.map((item, i) => ({ item, i })).filter(({ item }) => matches(query, item.q, item.a, item.from));
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  return (
    <Sheet
      title={d.reuseFaqTitle}
      onClose={onClose}
      query={query}
      setQuery={setQuery}
      footer={
        <button type="button" disabled={!picked.length} className={`${buttonClass.primary} w-full`} onClick={() => onAdd(picked.map((i) => ({ q: items[i].q, a: items[i].a })))}>
          {fmt(d.reuseAdd, { count: picked.length })}
        </button>
      }
    >
      {!items.length ? <p className="py-6 text-center text-sm text-muted">{d.reuseEmpty}</p> : !shown.length ? <p className="py-6 text-center text-sm text-muted">{d.reuseNoMatch}</p> : null}
      <ul className="flex flex-col gap-2">
        {shown.map(({ item, i }) => {
          const already = current.some((c) => sameFaq(c, item));
          const on = picked.includes(i);
          return (
            <li key={i}>
              <label className={`flex gap-3 rounded-input border p-3 text-sm transition ${already ? "border-line opacity-60" : on ? "border-accent bg-accent/5" : "cursor-pointer border-line hover:bg-surface"}`}>
                <input type="checkbox" checked={on} disabled={already} onChange={() => toggle(i)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.q}</span>
                  <span className="mt-0.5 line-clamp-3 block whitespace-pre-line text-muted">{item.a}</span>
                  <span className="mt-1 block text-xs text-muted">{already ? d.reuseAlready : fmt(d.reuseFrom, { deal: item.from })}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
