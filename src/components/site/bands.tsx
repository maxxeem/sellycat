"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { DEMO_BRANDS, DEMO_DEALS, DealArt, chf, discount, type DemoBrand, type DemoDeal } from "./demo-brands";
import { PhoneBuyDemo } from "./phone-buy-demo";

type Labels = Dictionary["site"]["bands"];
type Locale = "de" | "en";
type BandDeal = { deal: DemoDeal; brand: DemoBrand };

/**
 * Every example deal belongs to one of the fictional shops (the same software, three customers). The deal
 * in the phone is left out, and each row holds different deals (12 cards ≈ 3000 px), so no photo shows
 * twice on screen.
 */
const CARDS: BandDeal[] = DEMO_DEALS.slice(1).map((deal, i) => ({ deal, brand: DEMO_BRANDS[i % DEMO_BRANDS.length] }));

/**
 * First block under the hero (ported 1:1 from the reference bands): deal cards of fictional shops drift in
 * two slow bands — the upper one to the right, the lower one to the left — behind a large phone that
 * stands still in the middle and plays the «purchase → voucher» case. Nothing pauses on hover (the cards
 * are not interactive); `prefers-reduced-motion` gets a static grid instead. Each
 * band is rendered twice for a seamless loop. The cards are decorative examples (no links); the sense of
 * the block is the sr-only summary. The section heading is rendered by the parent.
 */
export function Bands({ labels, locale }: { labels: Labels; locale: Locale }) {
  const half = Math.ceil(CARDS.length / 2);
  const rows = [CARDS.slice(0, half), CARDS.slice(half)].filter((r) => r.length);
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // Bands only move while on screen (no work for a section the viewer cannot see).
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The middle phone snaps to whole pixels: whatever sits above it (rem sizes, fonts) leaves a fraction in its
  // page position, and the 1.5 px coral bezel then rasterised thinner at the top than at the bottom.
  const phone = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = phone.current;
    if (!el) return;
    const snap = () => {
      el.style.transform = "";
      const top = el.getBoundingClientRect().top + window.scrollY;
      const frac = top - Math.round(top);
      el.style.transform = frac ? `translateY(${-frac}px)` : "";
    };
    snap();
    const ro = new ResizeObserver(snap);
    ro.observe(document.body);
    window.addEventListener("resize", snap);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", snap);
    };
  }, []);
  return (
    <div ref={root} className="band-stage relative" data-testid="bands">
      <p className="sr-only">{labels.summary}</p>
      <div className="band-rows flex flex-col gap-5" data-running={inView ? "1" : "0"} aria-hidden>
        {rows.map((row, r) => {
          // The loop shifts by one copy: a copy must be at least as wide as the widest viewport we serve (3400 px),
          // so short rows repeat inside each copy. Otherwise wide screens show the end of the track (empty right side).
          const reps = Math.max(1, Math.ceil(3400 / (row.length * 250)));
          const copyCards = Array.from({ length: reps }, () => row).flat();
          return (
            <div key={r} className="band-viewport">
              <ul className={`band-track ${r === 0 ? "band-right" : "band-left"}`} style={{ ["--band-count" as string]: copyCards.length }}>
                {[0, 1].map((copy) => copyCards.map((c, i) => <Card key={`${copy}-${c.deal.id}-${i}`} card={c} uid={`band-${r}-${copy}-${i}`} index={r * 5 + (i % row.length)} labels={labels} locale={locale} />))}
              </ul>
            </div>
          );
        })}
      </div>
      {/* The still element in the middle: a large phone with the purchase case, on a soft veil; the bands run
          behind it from 600 px up; classic phone widths show the phone alone (site.css). */}
      <div className="band-centre pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <span className="band-veil absolute left-1/2 top-1/2 h-[190%] w-[400%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <div ref={phone} className="band-phone relative rounded-[3rem] bg-site-ground/40 p-3 backdrop-blur-sm">
          <PhoneBuyDemo labels={labels} locale={locale} />
        </div>
      </div>
      {/* Reduced motion only: the same deals as a static grid (eight cards show the idea). */}
      <ul className="band-grid grid grid-cols-2 gap-3" data-testid="bands-grid" aria-hidden>
        {CARDS.slice(0, 8).map((c, i) => <Card key={c.deal.id} card={c} uid={`grid-${i}`} index={i} labels={labels} locale={locale} />)}
      </ul>
    </div>
  );
}

/** A deal card of a fictional shop: code-drawn artwork drifting slowly (Ken Burns), title, partner, price, badge. */
function Card({ card, uid, index, labels, locale }: { card: BandDeal; uid: string; index: number; labels: Labels; locale: Locale }) {
  const { deal, brand } = card;
  // Alternate the badge: scarcity («7 left») and the discount.
  const badge = index % 2 === 0 ? labels.badges.left.replace("{n}", String(deal.left)) : labels.badges.off.replace("{n}", String(discount(deal)));
  return (
    <li className="band-card shrink-0">
      <div className="relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-site-surface ring-1 ring-fg/10">
        <span className="band-kenburns absolute inset-0" style={{ ["--kb-delay" as string]: `${-(index * 3.7) % 16}s` }}>
          {/* A unique gradient id per copy: an id whose first use sits in a hidden copy would not paint elsewhere. */}
          <DealArt deal={{ ...deal, id: `${deal.id}-${uid}` }} />
        </span>
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${index % 2 === 0 ? "bg-coral text-on-coral" : "bg-black/60 text-white backdrop-blur"}`}>{badge}</span>
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-16">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: brand.primary }} />
            <span className="truncate">{deal.partner}</span>
          </span>
          <span className="text-[15px] font-semibold leading-tight text-white">{deal.title[locale]}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">{chf(deal.priceCents)}</span>
            <span className="text-xs text-white/50 line-through">{chf(deal.valueCents)}</span>
          </span>
        </span>
      </div>
    </li>
  );
}
