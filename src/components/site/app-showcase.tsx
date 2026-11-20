"use client";

import { ChartPie, Globe, ListChecks, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Fill, useInView, useReducedMotion, useScenes } from "./demo-kit";
import { PhoneFrame } from "./device-frames";
import { SCAN_SCENES, ScanScreen, WALLET } from "./scan-demo";

type Labels = Dictionary["site"]["scan"];

/**
 * Redeeming section (ported from the reference app showcase): what the browser-based redeem flow does, four
 * points, a quiet «runs in any browser» note and a phone that plays scan → check → redeem → wallet update.
 */
const POINT_ICONS = [MonitorSmartphone, ChartPie, ShieldCheck, ListChecks];

export function AppShowcase({ labels: a, locale }: { labels: Labels; locale: "de" | "en" }) {
  const root = useDarkening();
  return (
    <section ref={root} id="einloesen" className="site-section relative scroll-mt-20" data-testid="scan-section">
      {/*
        Fade to black: while this section travels to the middle of the screen, a black veil over the whole
        viewport rises (--dark 0 → 0.92) and everything else on the page sinks into it, only this section stays
        lit; past the middle it lifts again. Fixed and above every other section (z-20, the page wrapper is the
        stacking context), this section's own layers sit above it. Only opacity changes.
      */}
      <div className="pointer-events-none fixed inset-0 z-20 bg-black" style={VEIL} aria-hidden />
      {/* In the dark, a faint coral grid comes up behind the content, fading out to the edges. */}
      <div className="pointer-events-none absolute inset-x-0 -inset-y-24 z-[21]" style={GRID} aria-hidden />
      {/* One grid, four parts: on phones intro, phone, points, note one after another; from lg the phone stands on the right across all rows. */}
      <div className="relative z-[22] mx-auto grid max-w-6xl items-center gap-x-16 gap-y-8 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="lg:col-start-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />{a.eyebrow}
          </p>
          <h2 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">{a.title}</h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/65 sm:text-lg">{a.text}</p>
        </div>
        <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <ScanPhone a={a} locale={locale} />
        </div>
        <ul className="grid grid-cols-2 gap-3 lg:col-start-1" data-testid="scan-points">
          {a.points.map((p, i) => {
            const Icon = POINT_ICONS[i] ?? ShieldCheck;
            return (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/10">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral/10 text-coral ring-1 ring-coral/30"><Icon className="h-4 w-4" aria-hidden /></span>
                <span className="min-w-0 text-[15px] font-semibold text-white">{p.title}</span>
              </li>
            );
          })}
        </ul>
        <div className="lg:col-start-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-white/70" data-testid="scan-browser">
            <Globe className="h-4 w-4 text-white/60" aria-hidden />{a.browser}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Scroll progress of the section as --dark on its element: 0 while it is far away, rising as it comes in,
 * highest when its centre crosses the centre of the screen, falling as it leaves. A smoothstep makes the
 * dimming start and end gently; reduced motion keeps the page as it is.
 */
const DARK_MAX = 0.92;
const VEIL: React.CSSProperties = { opacity: "var(--dark, 0)", willChange: "opacity" };
const GRID_LINE = "rgb(var(--coral-rgb) / 0.07)";
const GRID: React.CSSProperties = {
  opacity: "calc(var(--dark, 0) * 0.9)",
  backgroundImage: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
  backgroundSize: "48px 48px",
  maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 25%, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 25%, transparent 75%)",
};
const HALO: React.CSSProperties = {
  opacity: "calc(0.55 + var(--dark, 0) * 0.5)",
  background: "radial-gradient(closest-side, rgb(var(--coral-rgb) / 0.2), rgb(var(--glow-rgb) / 0.4) 55%, transparent)",
};
function useDarkening() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = 1 - Math.min(1, Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2));
      const x = Math.min(1, Math.max(0, (t - 0.12) / 0.6));
      el.style.setProperty("--dark", (DARK_MAX * x * x * (3 - 2 * x)).toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return root;
}

function ScanPhone({ a, locale }: { a: Labels; locale: "de" | "en" }) {
  const [inView, setRef] = useInView("40px");
  const reduced = useReducedMotion();
  const running = inView && !reduced;
  const { index, cycle } = useScenes(SCAN_SCENES, running);
  // Reduced motion: the end state (redeemed, wallet updated) as a still frame.
  const scene = reduced ? WALLET : index;
  return (
    <div ref={setRef} className="relative mx-auto w-fit" data-testid="scan-phone" data-scene={scene}>
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[160%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" style={HALO} aria-hidden />
      <PhoneFrame className="relative h-[520px] w-[240px] xl:h-[585px] xl:w-[270px]" label={a.phoneLabel}>
        <Fill width={390}><ScanScreen scene={scene} cycle={cycle} running={running} s={a.screen} locale={locale} /></Fill>
      </PhoneFrame>
    </div>
  );
}
