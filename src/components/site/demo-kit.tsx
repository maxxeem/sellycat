"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/**
 * Shared pieces of the landing page's product animations (ported from the reference landing): not
 * recordings but real UI drawn at a fixed design size, scaled to the box and driven by timers and
 * CSS keyframes (site.css). Everything moves only while on screen; reduced motion shows a still frame.
 */

const reducedQuery = "(prefers-reduced-motion: reduce)";
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(reducedQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

/** Visible on screen (an element under `display: none` never intersects, so hidden copies stay idle). */
export function useInView(margin = "80px"): [boolean, (el: HTMLElement | null) => void] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [el, margin]);
  return [inView, setEl];
}

/** A counter that advances every `ms` while `running`. */
export function useTicker(running: boolean, ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [running, ms]);
  return tick;
}

/**
 * Scenes of different lengths in a loop: returns the current index and a `cycle` that changes on every
 * scene, so keyed children remount and their CSS animations (delays = the scene's own timeline) restart.
 */
export function useScenes(durations: number[], running: boolean) {
  const [state, setState] = useState({ index: 0, cycle: 0 });
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setState((s) => ({ index: (s.index + 1) % durations.length, cycle: s.cycle + 1 })), durations[state.index]);
    return () => clearTimeout(id);
  }, [running, state, durations]);
  return state;
}

/**
 * Draws its child at a fixed design size and scales it to the available width (never above 1), so the
 * mockups look identical on every screen. Below 620 px a mockup may switch to its narrow (stacked) layout.
 */
export function Scaled({ wide, narrow, children }: { wide: [number, number]; narrow?: [number, number]; children: (narrow: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isNarrow = Boolean(narrow) && width > 0 && width < 620;
  const [w, h] = isNarrow && narrow ? narrow : wide;
  const scale = width ? Math.min(1, width / w) : 1;
  return (
    <div ref={ref} className="relative w-full" style={width ? { height: h * scale } : { aspectRatio: `${w} / ${h}` }}>
      {width ? (
        <div className="absolute left-1/2 top-0 origin-top" style={{ width: w, height: h, transform: `translateX(-50%) scale(${scale})` }} aria-hidden>
          {children(isNarrow)}
        </div>
      ) : null}
    </div>
  );
}

/** Fills a positioned box (a device screen): the design width is scaled to the box width, the height follows the box. */
export function Fill({ width: designWidth, children }: { width: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = box ? box.w / designWidth : 1;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden>
      {box && box.w > 0 ? (
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: designWidth, height: box.h / scale, transform: `scale(${scale})` }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Something that appears (or leaves) at `at` ms into the current scene. */
export function At({ at, out, className = "", children, style }: { at?: number; out?: number; className?: string; children?: ReactNode; style?: React.CSSProperties }) {
  const cls = out !== undefined ? "demo-out" : "demo-in";
  return (
    <div className={`${cls} ${className}`} style={{ ...style, ["--d" as string]: `${out ?? at ?? 0}ms` }}>
      {children}
    </div>
  );
}

/** A fingertip: taps at (x, y) in design px at `at` ms (negative y = from the bottom), or swipes by (dx, dy) px. */
export function Finger({ x, y, at, swipe }: { x: number; y: number; at: number; swipe?: [number, number] }) {
  return (
    <span
      className={`demo-finger pointer-events-none absolute z-40 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full ${swipe ? "demo-swipe" : "demo-tap"}`}
      style={{ left: x, ...(y < 0 ? { bottom: -y, translate: "-50% 50%" } : { top: y }), ["--d" as string]: `${at}ms`, ["--dx" as string]: `${swipe?.[0] ?? 0}px`, ["--dy" as string]: `${swipe?.[1] ?? 0}px` }}
    >
      <span className="demo-ripple absolute inset-0 rounded-full border-2 border-white/80" />
    </span>
  );
}

/** Mouse pointer for the notebook: moves from `from` to `to` (px of the design) starting at `at`, then clicks. */
export function Cursor({ from, to, at, dur = 900, click = true }: { from: [number, number]; to: [number, number]; at: number; dur?: number; click?: boolean }) {
  return (
    <span
      className="demo-cursor pointer-events-none absolute left-0 top-0 z-50"
      style={{ ["--x0" as string]: `${from[0]}px`, ["--y0" as string]: `${from[1]}px`, ["--x1" as string]: `${to[0]}px`, ["--y1" as string]: `${to[1]}px`, ["--d" as string]: `${at}ms`, ["--dur" as string]: `${dur}ms` }}
    >
      {click ? <span className="demo-click absolute -left-3 -top-3 h-6 w-6 rounded-full border-2 border-coral" /> : null}
      <svg width="22" height="22" viewBox="0 0 24 24" className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <path d="M4 2l15 10.5-6.6 1.3L16 21l-3 1.4-3.6-7.2L4 19z" fill="#fff" stroke="var(--site-ground)" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** The loop wrapper every demo uses: pauses its keyframes off screen (`data-running`), still frame under reduced motion. */
export function useDemo(margin?: string) {
  const [inView, ref] = useInView(margin);
  const reduced = useReducedMotion();
  return { running: inView && !reduced, reduced, ref };
}
