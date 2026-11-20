"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Fill } from "./demo-kit";
import { BrandMark, DEMO_BRANDS, DEMO_DEALS, DealArt, chf, discount, type DemoBrand, type DemoDeal } from "./demo-brands";
import "./audiences.css";

type Labels = Dictionary["site"]["audiences"];
type Locale = "de" | "en";
const HOVER_DELAY_MS = 350;

/** Only one preview plays at a time: starting a new one stops the previous. */
let stopActive: (() => void) | null = null;

/** Two more fictional customers for this row (invented names and colours, no real brands). */
const RETAIL: DemoBrand = { id: "retail", name: "Lindenhof Markt", domain: "gutscheine.lindenhof-markt.ch", primary: "#1D4ED8", onPrimary: "#FFFFFF", surface: "#F1F5FF", ink: "#0B1A3A", font: "system-ui, sans-serif", radius: 12, mark: "circle" };
const AGENCY: DemoBrand = { id: "agency", name: "Studio Nordlicht", domain: "shops.studio-nordlicht.ch", primary: "#C0266D", onPrimary: "#FFFFFF", surface: "#FFF1F7", ink: "#3B0A22", font: "Inter, system-ui, sans-serif", radius: 14, mark: "wave" };

const deal = (id: string): DemoDeal => DEMO_DEALS.find((d) => d.id === id) ?? DEMO_DEALS[0];
const [RADIO, CITY, CLUB] = DEMO_BRANDS;

/** One shop look per audience, in the order of `labels.tiles`. */
const LOOKS: { brand: DemoBrand; deals: DemoDeal[]; clients?: DemoBrand[] }[] = [
  { brand: RADIO, deals: ["kino", "brunch", "see", "pizza", "spa"].map(deal) },
  { brand: CLUB, deals: ["velo", "buch", "pizza", "brunch", "kino"].map(deal) },
  { brand: CITY, deals: ["alp", "see", "spa", "kino", "brunch"].map(deal) },
  { brand: RETAIL, deals: ["buch", "brunch", "velo", "pizza", "see"].map(deal) },
  { brand: AGENCY, deals: ["spa", "pizza", "alp", "velo", "buch"].map(deal), clients: [RADIO, CITY, CLUB] },
];

/**
 * Audiences as one wide row of 9:16 tiles (edges cut off, arrows top right on desktop). With a mouse,
 * resting on a tile for HOVER_DELAY_MS plays its loop (the mini shop scrolls, a deal pops); leaving
 * returns to the still poster.
 */
export function AudiencesTrack({ labels, locale }: { labels: Labels; locale: Locale }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => {
    // Full-bleed width without the scrollbar (100vw includes it and would overflow on desktop).
    const width = () => document.documentElement.style.setProperty("--fs-vw", `${document.documentElement.clientWidth}px`);
    const onResize = () => { width(); update(); };
    width();
    update();
    const el = track.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { el?.removeEventListener("scroll", update); window.removeEventListener("resize", onResize); };
  }, []);
  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>("li");
    const w = tile ? tile.getBoundingClientRect().width + 16 : el.clientWidth * 0.6;
    el.scrollBy({ left: dir * w * 2, behavior: "smooth" });
  };
  const arrow = "flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-site-surface/90 text-white/80 transition duration-300 hover:border-coral hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral aria-disabled:pointer-events-none aria-disabled:opacity-30";
  return (
    <>
      <div className="site-head flex items-end justify-between gap-6">
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.subtitle}</p>
        </div>
        <div className="hidden shrink-0 gap-2 lg:flex" data-testid="audiences-arrows">
          <button type="button" onClick={() => step(-1)} aria-disabled={edge.start} tabIndex={edge.start ? -1 : 0} aria-label={labels.prev} className={arrow} data-testid="audiences-prev"><ArrowLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => step(1)} aria-disabled={edge.end} tabIndex={edge.end ? -1 : 0} aria-label={labels.next} className={arrow} data-testid="audiences-next"><ArrowRight className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="inspiration-viewport" data-testid="audiences-track">
        <ul ref={track} className="inspiration-track flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {labels.tiles.map((tile, i) => {
            const look = LOOKS[i % LOOKS.length];
            return (
              <li key={look.brand.id} className="w-[62vw] max-w-[300px] shrink-0 snap-start sm:w-[240px] lg:w-[280px]">
                <AudienceTile name={tile.name} text={tile.text} look={look} labels={labels} locale={locale} />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function AudienceTile({ name, text, look, labels, locale }: { name: string; text: string; look: (typeof LOOKS)[number]; labels: Labels; locale: Locale }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const stop = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setPreviewing(false);
    if (stopActive === stop) stopActive = null;
  };
  const start = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = setTimeout(() => {
      stopActive?.();
      stopActive = stop;
      setPreviewing(true);
    }, HOVER_DELAY_MS);
  };
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="aud-tile group block" data-preview={previewing ? "1" : "0"} onMouseEnter={start} onMouseLeave={stop} data-testid={`audience-${look.brand.id}`}>
      <span className="relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-site-surface ring-1 ring-white/10 transition duration-300 group-hover:ring-white/25">
        <span className="absolute inset-0 block transition duration-500 group-hover:scale-[1.03]">
          <Fill width={300}><MiniShop look={look} labels={labels} locale={locale} /></Fill>
        </span>
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-20">
          <span className="text-[15px] font-semibold leading-tight text-white">{name}</span>
          <span className="overflow-hidden text-xs leading-snug text-white/75 [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]">{text}</span>
        </span>
      </span>
    </div>
  );
}

/** A fictional customer's shop on a phone screen (300 px design width): header, top deal, deal grid. */
function MiniShop({ look, labels, locale }: { look: (typeof LOOKS)[number]; labels: Labels; locale: Locale }) {
  const { brand, deals, clients } = look;
  const [top, ...rest] = deals;
  const r = brand.radius;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: brand.surface, color: brand.ink, fontFamily: brand.font }}>
      <div className="aud-scroll">
        {clients ? (
          <div className="flex items-center justify-between px-4 pt-4 text-[11px] font-semibold" style={{ color: brand.ink }}>
            <span className="opacity-60">{labels.mock.shops.replace("{n}", String(clients.length))}</span>
            <span className="flex gap-1.5">
              {clients.map((c) => (
                <span key={c.id} className="h-5 w-5 rounded-md ring-2 ring-white" style={{ background: c.primary, borderRadius: c.mark === "circle" ? 999 : 6 }} />
              ))}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <BrandMark brand={brand} size={22} />
          <span className="flex flex-col gap-[3px]" aria-hidden>
            {[0, 1, 2].map((k) => <span key={k} className="block h-[2px] w-4 rounded-full" style={{ background: brand.ink, opacity: 0.6 }} />)}
          </span>
        </div>
        <div className="mx-4 overflow-hidden bg-white shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)]" style={{ borderRadius: r }}>
          <div className="relative h-[150px]">
            <DealArt deal={{ ...top, id: `${brand.id}-${top.id}` }} />
            <span className="absolute left-2.5 top-2.5 px-2 py-0.5 text-[11px] font-bold" style={{ background: brand.primary, color: brand.onPrimary, borderRadius: Math.min(r, 999) }}>{labels.mock.top}</span>
            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold" style={{ color: brand.ink }}>-{discount(top)}%</span>
          </div>
          <div className="p-3">
            <p className="text-[11px] opacity-60">{top.partner}</p>
            <p className="text-[16px] font-bold leading-tight">{top.title[locale]}</p>
            <p className="mt-1.5 flex items-baseline gap-2 text-[13px]">
              <span className="font-bold" style={{ color: brand.primary }}>{chf(top.priceCents)}</span>
              <span className="line-through opacity-50">{chf(top.valueCents)}</span>
              <span className="ml-auto text-[11px] opacity-60">{labels.mock.left.replace("{n}", String(top.left))}</span>
            </p>
          </div>
        </div>
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3 pb-6">
          {rest.map((d, k) => (
            <div key={d.id} className={`relative overflow-hidden bg-white shadow-[0_6px_20px_-12px_rgba(0,0,0,0.25)] ${k === 0 ? "aud-pop" : ""}`} style={{ borderRadius: r }}>
              <div className="h-[78px]"><DealArt deal={{ ...d, id: `${brand.id}-${d.id}` }} /></div>
              <div className="p-2">
                <p className="text-[12px] font-bold leading-tight [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] overflow-hidden">{d.title[locale]}</p>
                <p className="mt-1 text-[12px] font-bold" style={{ color: brand.primary }}>{chf(d.priceCents)}</p>
              </div>
              {k === 0 ? <span className="aud-ring pointer-events-none absolute inset-0" style={{ borderRadius: r, boxShadow: `inset 0 0 0 2px ${brand.primary}` }} /> : null}
              {k === 0 ? (
                <span className="aud-badge absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: brand.primary, color: brand.onPrimary }}>
                  {labels.mock.left.replace("{n}", String(Math.min(3, d.left)))}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
