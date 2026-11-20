"use client";

import { useState } from "react";
import { BarChart } from "@/components/analytics/bar-chart";

export type PlatformSeries = { key: string; label: string; money?: string; points: { day: string; value: number }[] };

/** Platform trend: one series at a time (signups, orders, views, fees per currency). */
export function PlatformTrend({ series, locale }: { series: PlatformSeries[]; locale: string }) {
  const [key, setKey] = useState(series[0]?.key);
  const s = series.find((x) => x.key === key) ?? series[0];
  if (!s) return null;
  const tag = locale === "de" ? "de-CH" : "en-GB";
  const fmt = (v: number) =>
    s.money
      ? new Intl.NumberFormat(tag, { style: "currency", currency: s.money, maximumFractionDigits: v % 100 === 0 ? 0 : 2 }).format(v / 100)
      : new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(v);
  const date = (d: string) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return (
    <div>
      <div className="mb-5 flex w-fit flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
        {series.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={x.key === s.key}
            onClick={() => setKey(x.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${x.key === s.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <BarChart points={s.points.map((p) => ({ label: date(p.day), value: p.value, display: fmt(p.value) }))} format={fmt} label={s.label} />
    </div>
  );
}
