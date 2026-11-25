"use client";

import { ArrowDown, ArrowUp, CalendarClock, Eye, GripVertical, Hand, Sparkles, Star, TrendingUp } from "lucide-react";
import { useMemo, useState, useTransition, type DragEvent } from "react";
import { Card, Notice, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { DEAL_ORDERS, sortDeals, type DealOrder, type OrderableDeal } from "@/lib/shop/deal-order";
import { dealStatus } from "@/lib/shop/deal-status";
import { saveDealOrder } from "./actions";

export type ArrangeDeal = OrderableDeal & { title: string; partner: string | null; cover: string | null };

const ICONS: Record<DealOrder, typeof Hand> = { manual: Hand, newest: Sparkles, schedule: CalendarClock, popular: Eye, bestseller: TrendingUp };

/** Choose how the shop orders its deals; in "manual" mode drag them (or use the arrows). */
export function ArrangementEditor({ initialMode, deals, now }: { initialMode: DealOrder; deals: ArrangeDeal[]; now: string }) {
  const { t } = useI18n();
  const a = t.arrangement;
  const at = useMemo(() => new Date(now), [now]);
  const [mode, setMode] = useState<DealOrder>(initialMode);
  // Manual order: the top deal stays pinned, the rest in their saved positions.
  const [manual, setManual] = useState<ArrangeDeal[]>(() => sortDeals(deals, "manual", at).filter((d) => !d.featured));
  const [dragging, setDragging] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const pinned = deals.filter((d) => d.featured);
  const shown = mode === "manual" ? [...pinned, ...manual] : sortDeals(deals, mode, at);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= manual.length || from === to) return;
    const next = [...manual];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setManual(next);
    setDirty(true);
    setMessage(null);
  };

  const save = () =>
    start(async () => {
      const r = await saveDealOrder(mode, mode === "manual" ? [...pinned, ...manual].map((d) => d.id) : null);
      setMessage(r.ok ? { tone: "success", text: a.saved } : { tone: "error", text: a.failed });
      if (r.ok) setDirty(false);
    });

  const changed = dirty || mode !== initialMode;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">{a.intro}</p>
        <button type="button" className={buttonClass.primary} disabled={pending || !changed} onClick={save} data-testid="arrangement-save">
          {pending ? "…" : t.common.save}
        </button>
      </div>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" role="radiogroup" aria-label={a.title}>
        {DEAL_ORDERS.map((m) => {
          const Icon = ICONS[m];
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                setMessage(null);
              }}
              className={`flex flex-col gap-1.5 rounded-card border p-4 text-left transition ${mode === m ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}
              data-testid={`order-${m}`}
            >
              <Icon className="h-5 w-5 text-accent-text" aria-hidden />
              <span className="font-semibold">{a.modes[m].name}</span>
              <span className="text-xs text-muted">{a.modes[m].hint}</span>
            </button>
          );
        })}
      </div>

      <Card title={a.preview} description={mode === "manual" ? a.dragHint : undefined}>
        {!shown.length ? <p className="text-sm text-muted">{a.empty}</p> : null}
        <ol className="flex flex-col gap-2" data-testid="arrangement-list">
          {shown.map((d, i) => {
            const isPinned = d.featured;
            const idx = manual.indexOf(d);
            const draggable = mode === "manual" && !isPinned;
            const status = dealStatus(d, at);
            return (
              <li
                key={d.id}
                draggable={draggable}
                onDragStart={(e: DragEvent) => {
                  setDragging(idx);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (draggable && dragging !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging !== null && draggable) move(dragging, idx);
                  setDragging(null);
                }}
                onDragEnd={() => setDragging(null)}
                className={`flex items-center gap-3 rounded-input border bg-surface-2 p-2 ${dragging === idx && draggable ? "opacity-40" : ""} ${isPinned ? "border-accent/40" : "border-line"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
                {draggable ? <GripVertical className="h-4 w-4 shrink-0 text-muted" aria-hidden /> : isPinned ? <Star className="h-4 w-4 shrink-0 text-accent-text" aria-hidden /> : null}
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {d.cover ? <img src={d.cover} alt="" className="h-full w-full object-cover" draggable={false} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {[
                      isPinned ? a.top : d.partner,
                      fmt(a.sold, { count: d.sold_qty }),
                      fmt(a.views, { count: d.view_count ?? 0 }),
                      status === "scheduled" ? a.scheduled : status === "sold_out" ? a.soldOut : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {draggable ? (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="rounded-input p-1.5 text-muted hover:bg-surface hover:text-ink disabled:opacity-30" aria-label={a.up}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === manual.length - 1} className="rounded-input p-1.5 text-muted hover:bg-surface hover:text-ink disabled:opacity-30" aria-label={a.down}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
