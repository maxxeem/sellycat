"use client";

import { useState } from "react";

export type BarPoint = { label: string; value: number; display: string };

/** "Nice" upper bound for the axis: 1, 2, 2.5 or 5 × 10ⁿ. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/**
 * One series as columns (single hue, no legend: the heading names it). Hover or focus shows the
 * exact value; the whole column is the hit target. Axis labels stay in muted ink.
 */
export function BarChart({ points, format, label }: { points: BarPoint[]; format: (v: number) => string; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [max, max / 2, 0];
  const a = active != null ? points[active] : null;
  const tickEvery = Math.max(1, Math.ceil(points.length / 4));

  return (
    <div className="relative" role="img" aria-label={label}>
      <div className="flex gap-2">
        <div className="flex h-48 w-14 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-muted">
          {ticks.map((t, i) => (
            <span key={i} className={i === 0 ? "-mt-1.5" : i === 2 ? "-mb-1.5" : ""}>{format(t)}</span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          {/* Recessive grid: top, middle, baseline. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <div className="border-t border-dashed border-line" />
            <div className="border-t border-dashed border-line" />
            <div className="border-t border-line" />
          </div>
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
            {points.map((p, i) => (
              <button
                key={p.label + i}
                type="button"
                className="group flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${p.label}: ${p.display}`}
              >
                <span
                  className={`block w-full rounded-t-[4px] transition-opacity ${active == null || active === i ? "opacity-100" : "opacity-45"} ${p.value > 0 ? "bg-coral" : ""}`}
                  style={{ height: p.value > 0 ? `max(2px, ${(p.value / max) * 100}%)` : 0 }}
                />
              </button>
            ))}
          </div>
          {a && active != null && (
            <div
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md"
              style={{ left: `clamp(48px, ${((active + 0.5) / points.length) * 100}%, calc(100% - 48px))` }}
            >
              <div className="text-muted">{a.label}</div>
              <div className="font-semibold tabular-nums text-ink">{a.display}</div>
            </div>
          )}
        </div>
      </div>
      <div className="ml-16 mt-1.5 flex gap-[2px] text-[11px] text-muted">
        {points.map((p, i) => (
          <span key={p.label + i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
            {i % tickEvery === 0 || i === points.length - 1 ? p.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
