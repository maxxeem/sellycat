"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Dictionary } from "@/lib/i18n";
import { LaptopFrame } from "./device-frames";
import { StepDemo } from "./laptop-demos";

type Labels = Dictionary["site"]["steps"];

/**
 * «So funktioniert es» (ported from the reference landing): a column of step pills on the left (ARIA tabs, arrow
 * keys, Home/End), a large notebook on the right showing the active step's animated dashboard. The
 * switch is a 300 ms crossfade over stacked panels, so the height never changes. Like the reference landing, the
 * tabs only change on user input; the selected step's demo loops its own scenes while on screen.
 */
export function StepsShowcase({ labels }: { labels: Labels }) {
  const steps = labels.items;
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (e.key in keys) next = (active + keys[e.key] + steps.length) % steps.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = steps.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    // No box: pills and notebook sit directly on the section, the scroll-driven glow behind them.
    <div className="relative" data-testid="steps-box">
      {/* Phones and tablets: the three steps stacked as full-width pills, the notebook below at full width. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-14">
        <div role="tablist" aria-label={labels.tabs} aria-orientation="vertical" onKeyDown={onKeyDown} className="flex flex-col gap-3 lg:justify-center lg:gap-6" data-testid="steps-tabs">
          {steps.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.title}
                ref={(el) => { tabs.current[i] = el; }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${i}`}
                aria-selected={on}
                aria-controls={`${baseId}-panel-${i}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                aria-label={labels.show.replace("{title}", s.title)}
                className={`inline-flex w-full items-center gap-4 rounded-full py-3.5 pl-3.5 pr-6 text-left transition duration-300 lg:w-auto lg:py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-site-ground ${on ? "bg-coral text-on-coral" : "bg-fg/[0.06] text-fg hover:bg-fg/[0.1]"}`}
                data-testid={`step-tab-${i}`}
              >
                {/* Step number, not a plus: the pills read as 1 · 2 · 3. */}
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${on ? "bg-[var(--ink-brand)] text-coral" : "border border-fg/25 text-fg/80"}`} aria-hidden>
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold leading-tight lg:text-base">{s.title}</span>
                  <span className={`mt-1 block truncate text-xs leading-snug lg:text-[13px] ${on ? "text-on-coral/80" : "text-fg/55"}`}>{s.text}</span>
                </span>
              </button>
            );
          })}
        </div>
        {/* Notebook: generously sized, fully inside the column (nothing cut off). */}
        <div className="relative lg:self-center" data-testid="steps-stage">
          <div className="relative w-full">
            {steps.map((s, i) => (
              <div
                key={s.title}
                role="tabpanel"
                id={`${baseId}-panel-${i}`}
                aria-labelledby={`${baseId}-tab-${i}`}
                className={`${i === 0 ? "relative" : "absolute inset-0"} transition-opacity duration-300 ease-out motion-reduce:transition-none ${i === active ? "opacity-100" : "pointer-events-none opacity-0"}`}
                aria-hidden={i !== active}
                data-testid={`step-panel-${i}`}
              >
                <LaptopFrame className="w-full" label={labels.screens[i]}>
                  <StepDemo step={i} active={i === active} l={labels.demo} />
                </LaptopFrame>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
