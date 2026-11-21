"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_BRANDS, DEMO_DEALS, DealArt, chf } from "./demo-brands";

/**
 * One slot of the floating field behind the sentence (ported from the reference landing): position in %, tilt, depth
 * (0 = far and blurred, 2 = near and sharp), float period and phase; `m` = position on phones.
 */
type Slot = { x: number; y: number; rot: number; depth: 0 | 1 | 2; dur: number; delay: number; m?: [number, number] };
const SLOTS: Slot[] = [
  { x: 4, y: 12, rot: -14, depth: 2, dur: 11, delay: -2, m: [14, 9] },
  { x: 5, y: 58, rot: 9, depth: 1, dur: 13, delay: -7, m: [8, 24] },
  { x: 9, y: 88, rot: -6, depth: 0, dur: 15, delay: -4, m: [12, 88] },
  { x: 22, y: 12, rot: 16, depth: 0, dur: 12, delay: -9, m: [30, 24] },
  { x: 18, y: 92, rot: -11, depth: 2, dur: 10, delay: -1 },
  { x: 33, y: 6, rot: 7, depth: 1, dur: 14, delay: -6, m: [50, 5] },
  { x: 40, y: 90, rot: -15, depth: 0, dur: 16, delay: -3 },
  { x: 47, y: 14, rot: 4, depth: 0, dur: 13, delay: -8 },
  { x: 56, y: 92, rot: 12, depth: 0, dur: 15, delay: -5 },
  { x: 63, y: 4, rot: -9, depth: 1, dur: 12, delay: -2, m: [88, 12] },
  { x: 72, y: 26, rot: 13, depth: 0, dur: 14, delay: -10 },
  { x: 82, y: 90, rot: -12, depth: 2, dur: 11, delay: -4, m: [84, 94] },
  { x: 95, y: 52, rot: 6, depth: 1, dur: 13, delay: -7 },
  { x: 92, y: 10, rot: -16, depth: 2, dur: 10, delay: -3, m: [96, 97] },
  { x: 90, y: 86, rot: 10, depth: 0, dur: 16, delay: -6, m: [50, 94] },
  { x: 30, y: 88, rot: -5, depth: 0, dur: 15, delay: -1 },
  { x: 70, y: 10, rot: 8, depth: 0, dur: 14, delay: -8 },
  { x: 52, y: 95, rot: -3, depth: 0, dur: 17, delay: -5 },
];
const WIDTH = ["clamp(40px, 4.5vw, 72px)", "clamp(60px, 7vw, 110px)", "clamp(90px, 11.5vw, 176px)"];
const PARALLAX = [40, 90, 160];

/** A shop's mobile deal page in miniature (as buyers see it): shop bar, photo, title, price, stock, buy button. */
function FieldCard({ i, locale, buy }: { i: number; locale: "de" | "en"; buy: string }) {
  const deal = DEMO_DEALS[(i * 5) % DEMO_DEALS.length];
  const brand = DEMO_BRANDS[i % DEMO_BRANDS.length];
  const r = Math.max(4, brand.radius / 2);
  return (
    <div className="absolute inset-0 flex flex-col bg-white" style={{ fontFamily: brand.font, color: brand.ink }}>
      <div className="flex h-[9%] shrink-0 items-center gap-[6%] px-[8%]" style={{ background: brand.surface }}>
        <span className="aspect-square h-[46%] rounded-[30%]" style={{ background: brand.primary }} />
        <span className="truncate text-[clamp(4px,0.55vw,9px)] font-bold">{brand.name}</span>
      </div>
      <div className="mx-[6%] mt-[6%] aspect-[4/3] shrink-0 overflow-hidden" style={{ borderRadius: r }}>
        <DealArt deal={deal} />
      </div>
      <div className="flex flex-1 flex-col px-[8%] pt-[6%]">
        <span className="truncate text-[clamp(3.5px,0.45vw,7px)] font-semibold uppercase tracking-wider opacity-55">{deal.partner}</span>
        <span className="mt-[3%] line-clamp-2 text-[clamp(5px,0.68vw,11px)] font-bold leading-tight">{deal.title[locale]}</span>
        <span className="mt-[4%] flex items-baseline gap-[6%]">
          <span className="text-[clamp(5px,0.68vw,11px)] font-bold" style={{ color: brand.primary }}>{chf(deal.priceCents)}</span>
          <span className="text-[clamp(3.5px,0.45vw,7px)] line-through opacity-45">{chf(deal.valueCents)}</span>
        </span>
        <span className="mt-[5%] h-[3px] overflow-hidden rounded-full bg-black/[0.07]">
          <span className="block h-full rounded-full" style={{ width: `${20 + ((i * 17) % 60)}%`, background: brand.primary }} />
        </span>
        <span
          className="mb-[9%] mt-auto flex h-[12%] min-h-[8px] items-center justify-center text-[clamp(4px,0.55vw,9px)] font-bold"
          style={{ background: brand.primary, color: brand.onPrimary, borderRadius: r }}
        >
          {buy}
        </span>
      </div>
    </div>
  );
}

/**
 * The one-line statement over a field of floating mobile deal pages (Cosmos-style, as on
 * the reference landing): parallax at three depths via `--scroll`, floating on the spot, scaling in while the band
 * reveals (`--reveal`). Reduced motion renders the revealed, still state; the field is decorative.
 */
export function StatementBand({ before, brand, after, locale, buy }: { before: string; brand: string; after: string; locale: "de" | "en"; buy: string }) {
  const root = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "20% 0px" });
    io.observe(el);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--reveal", "1");
      el.style.setProperty("--scroll", "0");
      return () => io.disconnect();
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const centre = r.top + r.height / 2;
      const t = 1 - Math.min(1, Math.max(0, (Math.abs(centre - vh / 2) - vh / 6) / (vh / 2)));
      el.style.setProperty("--reveal", t.toFixed(3));
      el.style.setProperty("--scroll", Math.max(-1, Math.min(1, (centre - vh / 2) / vh)).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <section ref={root} className="statement-band relative isolate overflow-hidden" data-testid="statement" data-running={inView ? "1" : "0"}>
      <div className="statement-glow pointer-events-none absolute inset-0 -z-20" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {SLOTS.map((s, i) => (
          <div
            key={i}
            className="statement-slot absolute"
            data-depth={s.depth}
            data-m={s.m ? "1" : undefined}
            style={
              {
                "--x": `${s.x}%`,
                "--y": `${s.y}%`,
                "--mx": s.m ? `${s.m[0]}%` : undefined,
                "--my": s.m ? `${s.m[1]}%` : undefined,
                "--rot": `${s.rot}deg`,
                "--dur": `${s.dur}s`,
                "--delay": `${s.delay}s`,
                "--px": `${PARALLAX[s.depth]}px`,
                "--dx": `${(50 - s.x) * 5}px`,
                "--dy": `${(50 - s.y) * 3}px`,
                width: WIDTH[s.depth],
              } as React.CSSProperties
            }
          >
            <div className="statement-card relative aspect-[9/16] overflow-hidden rounded-[14%/8%] bg-white shadow-[0_24px_60px_-24px_rgba(17,17,17,0.35)] ring-1 ring-black/[0.06]">
              <FieldCard i={i} locale={locale} buy={buy} />
            </div>
          </div>
        ))}
      </div>
      <div className="statement-veil pointer-events-none absolute inset-0 -z-[5]" aria-hidden />
      <div className="statement-inner mx-auto flex min-h-[min(72vh,640px)] max-w-4xl items-center px-5 py-[calc(var(--site-gap)*1.6)] text-center sm:px-8 lg:min-h-[min(82vh,780px)]">
        <p className="text-balance text-[1.75rem] font-semibold leading-[1.25] tracking-[-0.02em] text-fg sm:text-4xl lg:text-[3rem] lg:leading-[1.2]">
          {before}
          <span className="text-coral">{brand}</span>
          {after}
        </p>
      </div>
    </section>
  );
}
