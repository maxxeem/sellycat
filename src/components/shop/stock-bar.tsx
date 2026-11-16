import { fmt } from "@/lib/i18n";
import type { ShopTexts } from "./shop-texts";

/**
 * Stock barometer: how much of the total quantity is gone (sold + currently reserved). Turns to
 * the warning colour when less than a fifth is left.
 */
export function StockBar({ total, taken, t, slim = false }: { total: number; taken: number; t: ShopTexts; slim?: boolean }) {
  if (total <= 0) return null;
  const used = Math.min(total, Math.max(0, taken));
  const left = total - used;
  const pct = Math.round((used / total) * 100);
  const low = left > 0 && left / total < 0.2;
  return (
    <div className="flex flex-col gap-1.5" data-testid="stock-bar">
      <div className={`flex items-baseline justify-between gap-2 ${slim ? "text-xs" : "text-sm"}`}>
        <span className="font-semibold">{fmt(t.stockSold, { percent: pct })}</span>
        <span className={low ? "font-semibold text-[var(--shop-warning)]" : "text-[var(--shop-muted)]"}>{left > 0 ? fmt(t.onlyLeft, { count: left }) : t.soldOut}</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--shop-text)_12%,transparent)] ${slim ? "h-1.5" : "h-2.5"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        aria-label={fmt(t.stockSold, { percent: pct })}
      >
        <div className={`h-full rounded-full ${low || left === 0 ? "bg-[var(--shop-warning)]" : "bg-[var(--shop-primary)]"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}
