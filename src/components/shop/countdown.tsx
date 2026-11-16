"use client";

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

/** Live countdown to the sales end (empty on the server, so cached pages never show a stale time). */
export function Countdown({ until, t, compact = false }: { until: string; t: ShopTexts; compact?: boolean }) {
  const now = useSyncExternalStore(subscribe, nowSecond, () => null);
  if (now === null) return <span className="inline-block h-5" aria-hidden />;
  const ms = Math.max(0, new Date(until).getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const parts = d > 0 ? [`${d}${t.days}`, `${h}${t.hours}`, `${m}${t.minutes}`] : [`${h}${t.hours}`, `${m}${t.minutes}`, `${s}${t.seconds}`];
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${compact ? "text-xs" : "text-sm"}`} role="timer" aria-label={`${t.endsIn} ${parts.join(" ")}`}>
      <span className="font-normal opacity-80">{t.endsIn}</span> {parts.join(" ")}
    </span>
  );
}
