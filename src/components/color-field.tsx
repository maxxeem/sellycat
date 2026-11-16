"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ColorPicker } from "@/components/color-picker";
import { inputClass } from "@/components/ui";
import { normaliseHex } from "@/lib/design/color";

/**
 * One colour setting: swatch, label, hex code. Rows share the grid of `ColorFieldGroup`, so all
 * swatches, labels and hex fields line up. The swatch opens the picker as a popup next to it; on
 * a phone it slides up from the bottom instead, with the colour still visible above it.
 */
export function ColorFieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_7.5rem] items-center gap-x-3 gap-y-3">{children}</div>;
}

export function ColorField({ label, value, onChange, presets = [], doneLabel = "OK" }: { label: string; value: string; onChange: (hex: string) => void; presets?: readonly string[]; doneLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // Follow outside changes (picker, branding import) unless the field is being typed in.
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <>
      <div ref={box} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="block h-10 w-10 rounded-input border border-line shadow-card"
          style={{ background: value }}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="dialog"
        />
        {open ? (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden />
            <div
              role="dialog"
              aria-label={label}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-line bg-surface-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-pop sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-72 sm:rounded-card"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-5 w-5 rounded-full border border-line" style={{ background: value }} /> {label}
                </span>
                <button type="button" onClick={() => setOpen(false)} className="rounded-input p-1.5 text-muted hover:bg-surface hover:text-ink" aria-label={doneLabel}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ColorPicker value={value} onChange={(hex) => onChange(hex.toLowerCase())} presets={presets} />
            </div>
          </>
        ) : null}
      </div>
      <span className="min-w-0 text-sm font-semibold leading-tight">{label}</span>
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = normaliseHex(e.target.value);
          if (v) onChange(v);
        }}
        onBlur={() => setDraft(value)}
        className={`${inputClass} font-mono`}
        aria-label={`${label} Hex`}
        spellCheck={false}
        autoCapitalize="off"
      />
    </>
  );
}
