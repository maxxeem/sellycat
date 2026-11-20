import Link from "next/link";
import { Card } from "@/components/ui";
import { RANGES, type RangeDays } from "@/lib/analytics/metrics";
import type { Dictionary } from "@/lib/i18n";


export function RangeSwitch({ days, labels, base }: { days: RangeDays; labels: Record<string, string>; base: string }) {
  return (
    <nav className="mb-6 flex w-fit flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`${base}?range=${r}`}
          scroll={false}
          aria-current={r === days ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${r === days ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {labels[String(r)]}
        </Link>
      ))}
    </nav>
  );
}

export function Kpi({ label, value, delta, hint, t }: { label: string; value: string; delta?: number | null; hint?: string; t: Dictionary["analytics"] }) {
  const up = delta != null && delta > 0.0005;
  const down = delta != null && delta < -0.0005;
  return (
    <Card className="!p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {delta !== undefined && (
        <p className="mt-1 text-xs text-muted">
          {delta == null ? (
            t.noCompare
          ) : (
            <>
              <span className={`font-semibold ${up ? "text-success" : down ? "text-danger" : "text-ink"}`}>
                {up ? "▲" : down ? "▼" : "■"} {`${up ? "+" : ""}${Math.round(delta * 100)} %`}
              </span>
            </>
          )}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

