"use client";

import { Timer } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { ShopTexts } from "./shop-texts";

// One shared one-second clock for every countdown on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const nowSecond = () => Math.floor(Date.now() / 1000) * 1000;

/** Remaining time split into days, hours, minutes, seconds. */
export function splitDuration(ms: number) {
  const v = Math.max(0, ms);
  return { d: Math.floor(v / 86_400_000), h: Math.floor((v % 86_400_000) / 3_600_000), m: Math.floor((v % 3_600_000) / 60_000), s: Math.floor((v % 60_000) / 1000) };
}
const two = (n: number) => String(n).padStart(2, "0");

/**
 * Live countdown (empty on the server, so cached pages never show a stale time).
 * - `boxes`: large tiles for the deal page
 * - `chip`: dark badge on a deal card image
 * - `inline`: one line of text
 * `mode` says whether it counts to the sales start or the sales end.
 */
export function Countdown({ until, t, variant = "inline", mode = "end" }: { until: string; t: ShopTexts; variant?: "inline" | "boxes" | "chip"; mode?: "start" | "end" }) {
  const now = useSyncExternalStore(subscribe, nowSecond, () => null);
  const label = mode === "start" ? t.startsIn : t.endsIn;
  const parts = now === null ? null : splitDuration(new Date(until).getTime() - now);
  const text = parts ? (parts.d > 0 ? `${parts.d}${t.days} ${two(parts.h)}:${two(parts.m)}:${two(parts.s)}` : `${two(parts.h)}:${two(parts.m)}:${two(parts.s)}`) : "";

  if (variant === "boxes") {
    const tiles: Array<[number | null, string]> = [
      [parts?.d ?? null, t.daysLong],
      [parts?.h ?? null, t.hoursLong],
      [parts?.m ?? null, t.minutesLong],
      [parts?.s ?? null, t.secondsLong],
    ];
    return (
      <div role="timer" aria-label={`${label} ${text}`} className="flex flex-col gap-2" data-testid="countdown">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Timer className="h-4 w-4 text-[var(--shop-primary)]" aria-hidden /> {label}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {tiles.map(([value, unit]) => (
            <div key={unit} className="flex flex-col items-center rounded-[var(--shop-radius)] bg-[var(--shop-text)] px-1 py-2 text-[var(--shop-bg)]">
              <span className="text-2xl font-bold leading-none tabular-nums">{value === null ? "--" : two(value)}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">{unit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "chip") {
    return (
      <span role="timer" aria-label={`${label} ${text}`} className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
        <Timer className="h-3.5 w-3.5" aria-hidden /> {text || "--:--:--"}
      </span>
    );
  }

  if (!parts) return <span className="inline-block h-5" aria-hidden />;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums" role="timer" aria-label={`${label} ${text}`}>
      <span className="font-normal opacity-80">{label}</span> {text}
    </span>
  );
}
