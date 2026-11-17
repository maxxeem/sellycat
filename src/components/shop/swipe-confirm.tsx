"use client";

import { useRef, useState } from "react";

/**
 * "Slide to redeem": the thumb must be dragged to the end (85 %) to confirm, so a stray tap
 * never redeems. Keyboard: focus the thumb and press Enter or Space.
 */
export function SwipeConfirm({ label, busyLabel, disabled = false, busy = false, onConfirm }: { label: string; busyLabel: string; disabled?: boolean; busy?: boolean; onConfirm: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [x, setX] = useState(0);
  const THUMB = 56;
  const max = () => Math.max(0, (track.current?.clientWidth ?? 0) - THUMB - 8);

  const end = () => {
    if (start.current === null) return;
    start.current = null;
    if (x >= max() * 0.85) {
      setX(max());
      onConfirm();
    } else setX(0);
  };

  const locked = disabled || busy;
  return (
    <div
      ref={track}
      className={`relative h-16 w-full select-none overflow-hidden rounded-full bg-[var(--shop-primary)] text-[var(--shop-on-primary)] ${locked ? "opacity-60" : ""}`}
      onPointerMove={(e) => {
        if (start.current === null || locked) return;
        setX(Math.min(max(), Math.max(0, e.clientX - start.current)));
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      data-testid="swipe-confirm"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: x + THUMB + 4 }} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-base font-bold" style={{ opacity: Math.max(0.15, 1 - x / Math.max(1, max())) }}>
        {busy ? busyLabel : label}
      </span>
      <button
        type="button"
        disabled={locked}
        aria-label={label}
        className="absolute left-1 top-1 flex h-14 w-14 touch-none items-center justify-center rounded-full bg-white text-[#111] shadow-md"
        style={{ transform: `translateX(${x}px)`, transition: start.current === null ? "transform .2s ease" : "none" }}
        onPointerDown={(e) => {
          if (locked) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          start.current = e.clientX - x;
        }}
        onKeyDown={(e) => {
          if (!locked && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setX(max());
            onConfirm();
          }
        }}
      >
        {busy ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
