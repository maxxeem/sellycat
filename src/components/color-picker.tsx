"use client";

import { Check, Pipette } from "lucide-react";
import { useRef, useState } from "react";
import { hexToHsv, hsvToHex, normaliseHex, type Hsv } from "@/lib/design/color";
import { useI18n } from "@/lib/i18n/context";

/**
 * Sellycat's colour picker (from SwypeCast), built for a finger first.
 *
 * The browser's native dialog opens in whatever mode the system last used, usually RGB, and a
 * page cannot change that; this one always leads with the hex code, which is how colours are
 * written down here. Saturation and brightness in the square, the hue below it as a bar one can
 * grab anywhere, the organisation's own colours and the classics as swatches, and the system
 * eyedropper where the browser has one.
 *
 * Everything that is dragged carries `touch-action: none`, so a drag moves the colour and never
 * the page behind it, and every handle is at least as wide as a fingertip.
 */
export function ColorPicker({
  value,
  presets = [],
  onChange,
  onPick,
  compact = false,
}: {
  value: string;
  presets?: readonly string[];
  /** About a fifth smaller, for the popup that hangs off an element on the stage; every target stays finger-sized. */
  compact?: boolean;
  /** Live while dragging. */
  onChange: (hex: string) => void;
  /** The colour is settled (a preset, the eyedropper, the end of a drag). */
  onPick?: (hex: string) => void;
}) {
  const { locale } = useI18n();
  const tx = (de: string, en: string) => (locale === "de" ? de : en);
  const clean = normaliseHex(value) ?? "#000000";
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(clean));
  const [seen, setSeen] = useState(clean);
  // Follow the value when it is set from outside, but never while the finger is on the square.
  if (seen !== clean) {
    setSeen(clean);
    setHsv(hexToHsv(clean));
  }
  const area = useRef<HTMLDivElement>(null);
  const hueBar = useRef<HTMLDivElement>(null);

  const apply = (next: Hsv, settled: boolean) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setSeen(hex.toLowerCase());
    onChange(hex);
    if (settled) onPick?.(hex);
  };

  const choose = (hex: string) => {
    const clean2 = (normaliseHex(hex) ?? hex).toUpperCase();
    setSeen(clean2.toLowerCase());
    setHsv(hexToHsv(clean2));
    onChange(clean2);
    onPick?.(clean2);
  };

  /** One drag for both areas: the box gives saturation and brightness, the bar the hue. The
      ref is read here, in the event, never while rendering. */
  const drag = (event: React.PointerEvent, box: React.RefObject<HTMLDivElement | null>, read: (x: number, y: number, rect: DOMRect) => Hsv) => {
    event.preventDefault();
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const at = (e: { clientX: number; clientY: number }, settled: boolean) => apply(read(e.clientX, e.clientY, rect), settled);
    at(event, false);
    const move = (e: PointerEvent) => at(e, false);
    const up = (e: PointerEvent) => {
      at(e, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const startArea = (event: React.PointerEvent) => drag(event, area, (x, y, rect) => ({ ...hsv, s: clamp((x - rect.left) / rect.width), v: 1 - clamp((y - rect.top) / rect.height) }));
  const startHue = (event: React.PointerEvent) => drag(event, hueBar, (x, _y, rect) => ({ ...hsv, h: clamp((x - rect.left) / rect.width) * 359 }));

  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const eyedropper = typeof window !== "undefined" && "EyeDropper" in window;
  // The same colour twice is one swatch; the organisation's own come first.
  const swatches = [...new Set(presets.map((p) => (normaliseHex(p) ?? p).toUpperCase()))];

  return (
    <div className={compact ? "space-y-2" : "space-y-3"} data-testid="color-picker">
      <div
        ref={area}
        onPointerDown={startArea}
        className={`relative w-full cursor-crosshair touch-none rounded-lg border border-line ${compact ? "h-28" : "h-40 sm:h-32"}`}
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})` }}
        role="application"
        aria-label={tx("Sättigung und Helligkeit", "Saturation and brightness")}
        data-testid="color-area"
      >
        <span
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv) }}
        />
      </div>

      {/* The hue is a bar, not a native slider: a slider's thumb is a few pixels wide, and
          beside it the finger scrolls the sheet instead of choosing a colour. */}
      <div
        ref={hueBar}
        onPointerDown={startHue}
        className="relative h-7 w-full cursor-pointer touch-none rounded-full"
        style={{ background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
        role="slider"
        aria-label={tx("Farbton", "Hue")}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          if (e.key === "ArrowLeft") apply({ ...hsv, h: Math.max(0, hsv.h - step) }, true);
          if (e.key === "ArrowRight") apply({ ...hsv, h: Math.min(359, hsv.h + step) }, true);
        }}
        data-testid="color-hue"
      >
        <span
          className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
          style={{ left: `${(hsv.h / 359) * 100}%`, background: hueHex }}
        />
      </div>

      {swatches.length > 0 ? (
        <div className={`grid gap-2 pt-0.5 ${compact ? "grid-cols-5" : "grid-cols-6"}`}>
          {swatches.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => choose(p)}
              aria-label={p}
              title={p}
              className={`flex w-full items-center justify-center rounded-md border border-line ${compact ? "h-8" : "h-9"}`}
              style={{ background: p }}
            >
              {clean.toUpperCase() === p ? <Check className="h-4 w-4" style={{ color: hexToHsv(p).v > 0.7 ? "#0b0b0c" : "#ffffff" }} /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {eyedropper ? (
        <button
          type="button"
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 text-xs text-muted transition hover:text-ink ${compact ? "h-8" : "h-9"}`}
          data-testid="color-eyedropper"
          onClick={async () => {
            try {
              const picker = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
              const result = await picker.open();
              choose(result.sRGBHex);
            } catch {
              // The person closed the eyedropper: nothing to do.
            }
          }}
        >
          <Pipette className="h-3.5 w-3.5" aria-hidden /> {tx("Farbe vom Bildschirm", "Pick from screen")}
        </button>
      ) : null}
    </div>
  );
}
