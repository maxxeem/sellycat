"use client";

import { useState } from "react";
import { BarChart } from "@/components/analytics/bar-chart";
import type { Dictionary } from "@/lib/i18n";
import type { DailyRow } from "@/lib/analytics/metrics";

const SERIES = [
  { key: "revenue", field: "revenue_cents", money: true },
  { key: "orders", field: "orders", money: false },
  { key: "vouchers", field: "vouchers", money: false },
  { key: "views", field: "deal_views", money: false },
  { key: "redemptions", field: "redemptions", money: false },
] as const;

/** The trend chart with a switch between series (one series at a time: one axis, one hue). */
export function Trend({ rows, currency, locale, unit, t }: { rows: DailyRow[]; currency: string; locale: string; unit: string; t: Dictionary["analytics"] }) {
  const [key, setKey] = useState<(typeof SERIES)[number]["key"]>("revenue");
  const [table, setTable] = useState(false);
  const s = SERIES.find((x) => x.key === key)!;
  const tag = locale === "de" ? "de-CH" : "en-GB";
  const money = (cents: number) =>
    new Intl.NumberFormat(tag, { style: "currency", currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
  const num = (n: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(n);
  const fmt = (v: number) => (s.money ? money(v) : num(v));
  const date = (d: string) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const points = rows.map((r) => ({ label: date(r.day), value: Number(r[s.field]) || 0, display: fmt(Number(r[s.field]) || 0) }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
          {SERIES.map((x) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={key === x.key}
              onClick={() => setKey(x.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${key === x.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {t.series[x.key]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setTable((v) => !v)} className="text-sm font-medium text-accent-text hover:underline">
          {t.tableView}
        </button>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{t.day}</th>
                <th className="px-3 py-2 text-right">{t.series[key]}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.display}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <BarChart points={points} format={fmt} label={`${t.series[key]} ${unit}`} />
      )}
      <p className="mt-3 text-xs text-muted">{`${t.series[key]} ${unit}`}</p>
    </div>
  );
}
