"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { LIST_SORTS, LIST_STATUSES, type ListSort, type ListStatus } from "@/lib/dashboard/deal-list";

/** Search, status chips (with counts) and sorting; everything lives in the URL. */
export function DealFilters({ q, status, sort, counts }: { q: string; status: ListStatus; sort: ListSort; counts: Record<ListStatus, number> }) {
  const { t } = useI18n();
  const l = t.deals.list;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [, start] = useTransition();

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || (k === "status" && v === "all") || (k === "sort" && v === "created")) next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Search while typing, a moment after the last key.
  useEffect(() => {
    if (text === q) return;
    const id = setTimeout(() => go({ q: text.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go reads the current URL itself
  }, [text]);

  const filtered = q || status !== "all" || sort !== "created";
  return (
    <div className="mb-5 flex flex-col gap-3" data-testid="deal-filters">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={l.search} aria-label={l.search} className={`${inputClass} pl-9`} data-testid="deal-search" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-muted">{l.sortLabel}</span>
          <select value={sort} onChange={(e) => go({ sort: e.target.value })} className={`${inputClass} sm:w-52`} data-testid="deal-sort">
            {LIST_SORTS.map((s) => (
              <option key={s} value={s}>
                {l.sorts[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Status">
        {LIST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => go({ status: s })}
            disabled={s !== "all" && counts[s] === 0 && status !== s}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition disabled:opacity-40 ${status === s ? "border-ink bg-ink text-surface-2" : "border-line text-muted hover:border-ink hover:text-ink"}`}
            data-testid={`deal-status-${s}`}
          >
            {l.statuses[s]}
            <span className={`text-xs ${status === s ? "opacity-80" : "opacity-60"}`}>{counts[s]}</span>
          </button>
        ))}
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              go({ q: "", status: "all", sort: "created" });
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> {l.reset}
          </button>
        ) : null}
      </div>
    </div>
  );
}
