"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_DEALS, DealArt, chf } from "./demo-brands";

/**
 * One slot of the floating field behind the sentence (ported from the reference landing): position in %, tilt, depth
 * (0 = far and blurred, 2 = near and sharp), float period and phase; `m` = position on phones.
 */
type Slot = { x: number; y: number; rot: number; depth: 0 | 1 | 2; dur: number; delay: number; m?: [number, number] };
const SLOTS: Slot[] = [
  { x: 4, y: 12, rot: -14, depth: 2, dur: 11, delay: -2, m: [14, 9] },
  { x: 15, y: 62, rot: 9, depth: 1, dur: 13, delay: -7, m: [8, 40] },
  { x: 9, y: 88, rot: -6, depth: 0, dur: 15, delay: -4, m: [12, 88] },
  { x: 24, y: 28, rot: 16, depth: 0, dur: 12, delay: -9, m: [30, 24] },
  { x: 21, y: 78, rot: -11, depth: 2, dur: 10, delay: -1 },
  { x: 33, y: 6, rot: 7, depth: 1, dur: 14, delay: -6, m: [50, 5] },
  { x: 40, y: 90, rot: -15, depth: 0, dur: 16, delay: -3 },
  { x: 47, y: 14, rot: 4, depth: 0, dur: 13, delay: -8 },
  { x: 56, y: 92, rot: 12, depth: 0, dur: 15, delay: -5 },
  { x: 63, y: 4, rot: -9, depth: 1, dur: 12, delay: -2, m: [88, 12] },
  { x: 72, y: 26, rot: 13, depth: 0, dur: 14, delay: -10 },
  { x: 76, y: 74, rot: -12, depth: 2, dur: 11, delay: -4, m: [86, 86] },
  { x: 84, y: 48, rot: 6, depth: 1, dur: 13, delay: -7 },
  { x: 92, y: 10, rot: -16, depth: 2, dur: 10, delay: -3, m: [92, 46] },
  { x: 90, y: 86, rot: 10, depth: 0, dur: 16, delay: -6, m: [50, 94] },
  { x: 30, y: 46, rot: -5, depth: 0, dur: 15, delay: -1 },
  { x: 67, y: 52, rot: 8, depth: 0, dur: 14, delay: -8 },
  { x: 50, y: 60, rot: -3, depth: 0, dur: 17, delay: -5 },
];
const WIDTH = ["clamp(40px, 4.5vw, 72px)", "clamp(60px, 7vw, 110px)", "clamp(90px, 11.5vw, 176px)"];
const PARALLAX = [40, 90, 160];

/** Three kinds of card float in the field: a deal, a voucher with its code, a wallet pass. */
function FieldCard({ i, locale }: { i: number; locale: "de" | "en" }) {
  const deal = DEMO_DEALS[i % DEMO_DEALS.length];
  const kind = i % 3;
  if (kind === 0)
    return (
      <>
        <DealArt deal={deal} className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-[8%] pt-[30%]">
          <p className="text-[clamp(6px,0.75vw,12px)] font-semibold leading-tight text-white">{deal.title[locale]}</p>
          <p className="text-[clamp(5px,0.6vw,10px)] text-white/75">{chf(deal.priceCents)}</p>
        </div>
      </>
    );
  if (kind === 1)
    return (
      <div className="absolute inset-0 flex flex-col bg-white">
        <div className="h-[38%]">
          <DealArt deal={deal} />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-[6%] p-[8%]">
          <span className="h-[3%] w-[70%] rounded-full bg-black/15" />
          <span className="h-[3%] w-[50%] rounded-full bg-black/10" />
          <span className="mt-[6%] grid aspect-square w-[52%] grid-cols-5 gap-[6%]" aria-hidden>
            {Array.from({ length: 25 }, (_, k) => (
              <span key={k} className={(k * 7 + i) % 3 === 0 || [0, 4, 20].includes(k) ? "bg-black" : "bg-transparent"} />
            ))}
          </span>
        </div>
      </div>
    );
  return (
    <div className="absolute inset-0 flex flex-col p-[9%]" style={{ background: deal.hue[1] }}>
      <span className="h-[3%] w-[45%] rounded-full bg-white/70" />
      <span className="mt-[8%] h-[5%] w-[80%] rounded-full bg-white" />
      <span className="mt-[5%] h-[3%] w-[55%] rounded-full bg-white/60" />
      <span className="mt-auto grid aspect-square w-[58%] self-center grid-cols-5 gap-[5%] rounded-[8%] bg-white p-[7%]" aria-hidden>
        {Array.from({ length: 25 }, (_, k) => (
          <span key={k} className={(k * 5 + i) % 3 === 0 || [0, 4, 20].includes(k) ? "bg-black" : "bg-transparent"} />
        ))}
      </span>
    </div>
  );
}

/**
 * The one-line statement over a field of floating deals, vouchers and wallet passes (Cosmos-style, as on
 * the reference landing): parallax at three depths via `--scroll`, floating on the spot, scaling in while the band
 * reveals (`--reveal`). Reduced motion renders the revealed, still state; the field is decorative.
 */
export function StatementBand({ before, brand, after, locale }: { before: string; brand: string; after: string; locale: "de" | "en" }) {
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
            <div className="statement-card relative aspect-[9/16] overflow-hidden rounded-[14%/8%] border border-white/10 bg-site-raise shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
              <FieldCard i={i} locale={locale} />
              {/* Ember tint keeps the field in Sellycat's colour world; far cards are tinted more. */}
              <div className="statement-tint absolute inset-0 bg-site-raise mix-blend-color" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-site-ground/50" />
            </div>
          </div>
        ))}
      </div>
      <div className="statement-veil pointer-events-none absolute inset-0 -z-[5]" aria-hidden />
      <div className="statement-inner mx-auto flex min-h-[min(72vh,640px)] max-w-4xl items-center px-5 py-[calc(var(--site-gap)*1.6)] text-center sm:px-8 lg:min-h-[min(82vh,780px)]">
        <p className="text-[1.75rem] font-semibold leading-[1.25] tracking-[-0.02em] text-white sm:text-4xl lg:text-[3rem] lg:leading-[1.2]">
          {before}
          <span className="text-coral">{brand}</span>
          {after}
        </p>
      </div>
    </section>
  );
}
