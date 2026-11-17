"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import type { PlaceDetails, PlaceSuggestion } from "@/lib/places/google";

/**
 * Google business search while typing; choosing a result hands its address, position and
 * opening hours to the form. One session token per search (one billable session at Google).
 */
export function PlaceSearch({
  search,
  details,
  onPick,
}: {
  search: (q: string, session: string) => Promise<{ configured: boolean; results: PlaceSuggestion[] }>;
  details: (id: string, session: string) => Promise<PlaceDetails | null>;
  onPick: (place: PlaceDetails) => void;
}) {
  const { t } = useI18n();
  const p = t.partners;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [configured, setConfigured] = useState(true);
  const [searched, setSearched] = useState(false);
  const [pending, start] = useTransition();
  const session = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const onType = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (!session.current) session.current = crypto.randomUUID();
    timer.current = setTimeout(
      () =>
        start(async () => {
          const r = await search(q, session.current);
          setConfigured(r.configured);
          setResults(r.results);
          setSearched(true);
        }),
      300,
    );
  };

  const close = () => {
    setResults([]);
    setSearched(false);
  };

  const pick = (s: PlaceSuggestion) =>
    start(async () => {
      const place = await details(s.id, session.current || crypto.randomUUID());
      session.current = "";
      setResults([]);
      setSearched(false);
      setQuery("");
      if (place) onPick(place);
    });

  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{p.placeSearch}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          // Closing a moment later lets a click on a result land first.
          onBlur={() => setTimeout(close, 200)} placeholder={p.placePlaceholder} className={`${inputClass} pl-9`} autoComplete="off" data-testid="place-search" />
        {pending ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-hidden /> : null}
      </div>
      <span className="text-xs text-muted">{configured ? p.placeHint : p.placeNotConfigured}</span>
      {results.length || (searched && configured) ? (
        <ul className="absolute left-0 right-0 top-[4.6rem] z-40 overflow-hidden rounded-2xl border border-line bg-surface-2 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)]" role="listbox">
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button type="button" onClick={() => pick(r)} className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left hover:bg-surface">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.main}</span>
                  <span className="block truncate text-xs text-muted">{r.secondary}</span>
                </span>
              </button>
            </li>
          ))}
          {!results.length ? <li className="px-3 py-2 text-sm text-muted">{p.placeNoResults}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
