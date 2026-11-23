"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fontCssUrl } from "@/lib/design/font-proxy";
import { GOOGLE_FONT_LIST, type FontCategory } from "@/lib/design/google-fonts";
import { useI18n } from "@/lib/i18n/context";

const PAGE = 60;
const family = (name: string) => `family=${name.trim().replace(/ /g, "+")}`;

/** Adds a font's stylesheet once (through our proxy); the browser fetches only the subsets it needs. */
function loadFont(name: string, weights = "") {
  const href = fontCssUrl(`${family(name)}${weights}&display=swap`);
  if (document.head.querySelector(`link[data-font-preview="${CSS.escape(href)}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.fontPreview = href;
  document.head.appendChild(link);
}

/** Loads the font of a list entry only when it scrolls into view. */
function useLoadWhenVisible(name: string) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadFont(name);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [name]);
  return ref;
}

function FontOption({ name, id, selected, active, sample, onPick, onHover }: { name: string; id: string; selected: boolean; active: boolean; sample: string; onPick: () => void; onHover: () => void }) {
  const ref = useLoadWhenVisible(name);
  return (
    <li ref={ref} id={id} role="option" aria-selected={selected}>
      <button type="button" onClick={onPick} onMouseEnter={onHover} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${active ? "bg-surface" : ""}`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg leading-tight" style={{ fontFamily: `"${name}", system-ui` }}>
            {name}
          </span>
          <span className="block truncate text-xs text-muted" style={{ fontFamily: `"${name}", system-ui` }}>
            {sample}
          </span>
        </span>
        {selected ? <Check className="h-4 w-4 shrink-0 text-accent-text" aria-hidden /> : null}
      </button>
    </li>
  );
}

/**
 * Google Font picker in the app's own look: search, every font shown in its own typeface, and a
 * larger sample of the chosen one (heading and body text).
 */
export function FontPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (family: string) => void;
  placeholder: string;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [limit, setLimit] = useState(PAGE);
  const more = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (value.trim()) loadFont(value, ":wght@400;700");
  }, [value]);

  const all = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GOOGLE_FONT_LIST.filter((f) => (category === "all" || f.category === category) && (!q || f.family.toLowerCase().includes(q))).map((f) => f.family);
  }, [query, category]);
  // ~1800 families: render a page at a time, the next one when the end of the list scrolls into view.
  const matches = all.slice(0, limit);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + PAGE);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [open, all, limit]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (f: string) => {
    onChange(f);
    setOpen(false);
    setQuery("");
  };
  const sample =
    locale === "de" ? "Sommer-Deals in Zürich" : "Summer deals in Zurich";

  return (
    <div className="flex flex-col gap-2">
      <div ref={box} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setActive(0);
            setLimit(PAGE);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center gap-2 rounded-input border border-line bg-surface-2 px-3 py-2.5 text-left outline-none transition hover:border-ink focus:border-ink focus:ring-2 focus:ring-accent/30"
          data-testid="font-picker"
        >
          <span
            className={`min-w-0 flex-1 truncate text-base ${value ? "" : "text-muted"}`}
            style={value ? { fontFamily: `"${value}", system-ui` } : undefined}
          >
            {value || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="h-4 w-4 text-muted" aria-hidden />
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                  setLimit(PAGE);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, matches.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (matches[active]) pick(matches[active]);
                  } else if (e.key === "Escape") setOpen(false);
                }}
                placeholder={placeholder}
                className="w-full bg-transparent py-3 text-sm placeholder:text-muted"
              // The global focus ring would frame the search inside the popup; the popup itself shows focus.
              style={{ outline: "none" }}
                role="combobox"
                aria-controls={id}
                aria-expanded
                aria-activedescendant={
                  matches[active] ? `${id}-${active}` : undefined
                }
              />
            </div>
            <div className="flex flex-wrap gap-1 border-b border-line px-2 py-2" role="radiogroup" aria-label={t.design.fontCategory}>
              {(["all", "s", "r", "d", "h", "m"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={category === c}
                  onClick={() => {
                    setCategory(c);
                    setActive(0);
                    setLimit(PAGE);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category === c ? "bg-ink text-surface-2" : "bg-surface text-muted hover:text-ink"}`}
                >
                  {t.design.fontCats[c]}
                </button>
              ))}
              <span className="ml-auto self-center pr-1 text-xs text-muted">{all.length}</span>
            </div>
            <ul
              id={id}
              role="listbox"
              className="max-h-80 overflow-y-auto p-1.5"
            >
              {matches.map((f, i) => (
              <FontOption key={f} name={f} id={`${id}-${i}`} selected={f === value} active={i === active} sample={sample} onPick={() => pick(f)} onHover={() => setActive(i)} />
            ))}
            {matches.length < all.length ? <li ref={more} className="h-8" aria-hidden /> : null}
            {!matches.length ? (
                <li className="px-3 py-4 text-sm text-muted">–</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {value ? (
        <div
          className="rounded-input border border-line bg-surface p-3"
          style={{ fontFamily: `"${value}", system-ui` }}
          data-testid="font-sample"
        >
          <p className="text-xl font-bold leading-tight">{sample}</p>
          <p className="mt-1 text-sm">{t.design.fontSampleText}</p>
        </div>
      ) : null}
    </div>
  );
}
