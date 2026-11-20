"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { PARTNER_FILTERS, PARTNER_SORTS, type PartnerFilter, type PartnerSort } from "@/lib/dashboard/partner-list";
import { Select } from "@/components/select";

/** Search, filter chips with counts, city and sorting; everything lives in the URL (like deals). */
export function PartnerFilters({ q, filter, city, sort, counts, cities }: { q: string; filter: PartnerFilter; city: string; sort: PartnerSort; counts: Record<PartnerFilter, number>; cities: string[] }) {
  const { t } = useI18n();
  const l = t.partners.list;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [, start] = useTransition();

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || (k === "filter" && v === "all") || (k === "sort" && v === "name")) next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if (text === q) return;
    const id = setTimeout(() => go({ q: text.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go reads the current URL itself
  }, [text]);

  const filtered = q || filter !== "all" || city || sort !== "name";
  return (
    <div className="flex flex-col gap-3" data-testid="partner-filters">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={l.search} aria-label={l.search} className={`${inputClass} pl-9`} data-testid="partner-search" />
        </label>
        {cities.length > 1 ? (
          <Select value={city} onChange={(e) => go({ city: e.target.value })} aria-label={l.city} className="w-full sm:w-40">
            <option value="">{l.allCities}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        ) : null}
        <Select value={sort} onChange={(e) => go({ sort: e.target.value })} aria-label={l.sortLabel} className="w-full sm:w-48">
          {PARTNER_SORTS.map((s) => (
            <option key={s} value={s}>{l.sorts[s]}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={l.sortLabel}>
        {PARTNER_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={filter === s}
            onClick={() => go({ filter: s })}
            disabled={s !== "all" && counts[s] === 0 && filter !== s}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition disabled:opacity-40 ${filter === s ? "border-ink bg-ink text-surface-2" : "border-line text-muted hover:border-ink hover:text-ink"}`}
          >
            {l.filters[s]}
            <span className={`text-xs ${filter === s ? "opacity-80" : "opacity-60"}`}>{counts[s]}</span>
          </button>
        ))}
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              go({ q: "", filter: "all", city: "", sort: "name" });
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
