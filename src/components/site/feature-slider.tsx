"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ChartColumn, FileText, Globe, Handshake, Palette, ScanLine, Timer, WalletCards, Webhook, Banknote, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { FEATURE_KEYS, FeatureArt, type FeatureKey } from "./feature-art";
import "./features.css";

type Labels = Dictionary["site"]["features"];

const ICONS: Record<FeatureKey, LucideIcon> = {
  brand: Palette,
  domain: Globe,
  money: Banknote,
  pdf: FileText,
  wallet: WalletCards,
  scan: ScanLine,
  stock: Timer,
  partners: Handshake,
  analytics: ChartColumn,
  team: Webhook,
};

const GAP = 20; // px, keep in sync with `gap-5` on the track
const PIN_QUERY = "(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)";
/** Pinned scroll distance: this many viewport heights per visible card group, capped in total. */
const PIN_SCREENS_PER_GROUP = 0.9;
const PIN_MAX_SCREENS = 2.4;
const PIN_DAMPING = 0.18; // per frame, ~5 frames to settle

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Width of the track without its gutters (the gutters align the cards with the section heading). */
const trackInnerWidth = (track: HTMLElement) => {
  const cs = getComputedStyle(track);
  return track.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
};
/** Horizontal distance until the last card sits flush with the right gutter (independent of any translate). */
const trackTravel = (track: HTMLElement) => {
  const cards = track.querySelectorAll<HTMLElement>(":scope > li");
  if (!cards.length) return 0;
  const width = cards[cards.length - 1].getBoundingClientRect().right - cards[0].getBoundingClientRect().left;
  return Math.max(0, width - trackInnerWidth(track));
};
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * «Alles drin» as a horizontal card slider (ported 1:1 from the reference landing): CSS scroll snap does the
 * swiping, momentum and snapping; JavaScript only adds the arrows, mouse drag, arrow keys and the dot
 * indicator. On desktop (PIN_QUERY) the section is pinned and the page's vertical scroll drives the
 * track horizontally (transform, damped in rAF); arrows and drag then move the page instead. Without
 * JavaScript or with reduced motion the track becomes a static grid (site.css).
 */
export function FeatureSlider({ labels }: { labels: Labels }) {
  const headingId = useId();
  const wrapRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [index, setIndex] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });
  // Pinned geometry (px): section top in the document, vertical distance of the pin, horizontal travel of the track.
  const geo = useRef({ top: 0, distance: 0, travel: 0, x: 0, target: 0 }); // x = damped, target = from the scroll position
  const total = FEATURE_KEYS.length;

  const step = useCallback(() => {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    return (first?.getBoundingClientRect().width ?? 0) + GAP;
  }, []);

  /** Document scroll position at which card `i` sits at the left edge (pinned mode). */
  const pageYForCard = useCallback((i: number) => {
    const { top, distance, travel } = geo.current;
    return top + (travel ? clamp01((i * step()) / travel) : 0) * distance;
  }, [step]);

  const currentIndex = useCallback(() => {
    const s = step() || 1;
    const x = pinned ? geo.current.target : trackRef.current?.scrollLeft ?? 0;
    return Math.max(0, Math.min(total - 1, Math.round(x / s)));
  }, [total, pinned, step]);

  const goToCard = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      if (!track) return;
      const b = reducedMotion() ? "auto" : behavior;
      if (pinned) window.scrollTo({ top: pageYForCard(i), behavior: b });
      else track.scrollTo({ left: i * step(), behavior: b });
    },
    [pageYForCard, pinned, step],
  );

  // Real viewport width (without the scrollbar) for the full-bleed track and its gutters.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const apply = () => wrap.style.setProperty("--fs-vw", `${document.documentElement.clientWidth}px`);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // Desktop with motion allowed: pin the section and drive the track from the page scroll.
  useEffect(() => {
    const mq = window.matchMedia(PIN_QUERY);
    const apply = () => setPinned(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Illustration animations run only while their card is on screen (data-inview drives site.css).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.setAttribute("data-inview", ""); else e.target.removeAttribute("data-inview"); }), { threshold: 0.2 });
    track.querySelectorAll("[data-feature-card]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current, track = trackRef.current, bar = barRef.current;
    if (!wrap || !track) return;
    if (!pinned) {
      wrap.style.height = "";
      track.style.transform = "";
      geo.current = { top: 0, distance: 0, travel: 0, x: 0, target: 0 };
      return;
    }
    let target = 0, raf = 0, lastEdge = "";
    const tick = () => {
      const g = geo.current;
      g.x += (target - g.x) * PIN_DAMPING;
      if (Math.abs(target - g.x) < 0.5) g.x = target;
      track.style.transform = `translate3d(${-g.x}px,0,0)`;
      raf = g.x === target ? 0 : requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const g = geo.current;
      const p = g.distance ? clamp01((window.scrollY - g.top) / g.distance) : 0;
      target = p * g.travel;
      g.target = target;
      if (bar) bar.style.transform = `scaleX(${p})`;
      const e = `${p <= 0.001}:${p >= 0.999}`;
      if (e !== lastEdge) { lastEdge = e; setEdge({ start: p <= 0.001, end: p >= 0.999 }); }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const measure = () => {
      const g = geo.current;
      g.travel = trackTravel(track);
      const vh = window.innerHeight;
      const groups = g.travel / Math.max(1, trackInnerWidth(track));
      g.distance = Math.round(Math.min(PIN_MAX_SCREENS, Math.max(1, groups * PIN_SCREENS_PER_GROUP)) * vh);
      // The section is exactly the pinned content plus the scroll distance (not a full screen): once the
      // cards have travelled, the next section follows at the normal gap instead of the rest of the viewport.
      const content = wrap.firstElementChild as HTMLElement | null;
      wrap.style.height = `${(content?.offsetHeight ?? vh) + g.distance}px`;
      g.top = wrap.getBoundingClientRect().top + window.scrollY;
      onScroll();
    };
    // Tab focus (or find-in-page) scrolls the clipped viewport sideways instead of the page: translate
    // that offset into the matching page position and reset it, so no card is ever reachable but unseen.
    const vp = viewportRef.current;
    const onViewportScroll = () => {
      if (!vp || vp.scrollLeft === 0) return;
      const g = geo.current;
      const p = g.travel ? clamp01((g.x + vp.scrollLeft) / g.travel) : 0;
      vp.scrollLeft = 0;
      g.x = p * g.travel;
      track.style.transform = `translate3d(${-g.x}px,0,0)`;
      window.scrollTo({ top: g.top + p * g.distance, behavior: "auto" });
    };
    measure();
    vp?.addEventListener("scroll", onViewportScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    // Content above can still change height (images, fonts): keep the section's document position fresh.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { geo.current.top = wrap.getBoundingClientRect().top + window.scrollY; onScroll(); }) : null;
    ro?.observe(document.body);
    return () => {
      vp?.removeEventListener("scroll", onViewportScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pinned]);

  // Free mode: active dot and arrow state follow the track's own scroll position.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || pinned) return;
    const update = () => {
      setIndex(currentIndex());
      setEdge({ start: track.scrollLeft <= 2, end: track.scrollLeft >= trackTravel(track) - 2 });
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [currentIndex, pinned]);

  // Mouse drag: in free mode the track scrolls (snapping paused, the browser snaps on release); in pinned
  // mode the drag moves the page and releases onto the nearest card. No pointer capture, so a plain click
  // still reaches a button underneath.
  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const track = e.currentTarget;
    const d = { x: e.clientX, left: track.scrollLeft, pageY: window.scrollY, moved: false };
    const ratio = geo.current.travel ? geo.current.distance / geo.current.travel : 1;
    if (!pinned) { track.style.scrollSnapType = "none"; track.style.scrollBehavior = "auto"; }
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      if (pinned) window.scrollTo({ top: d.pageY - dx * ratio, behavior: "auto" });
      else track.scrollLeft = d.left - dx;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      track.style.scrollSnapType = "";
      track.style.scrollBehavior = "";
      if (pinned && d.moved) goToCard(Math.round(((window.scrollY - geo.current.top) / (geo.current.distance || 1)) * (geo.current.travel / (step() || 1))));
      if (d.moved) {
        // Swallow the click that ends a drag so a button under the cursor does not fire.
        const swallow = (ev: Event) => ev.stopPropagation();
        track.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => track.removeEventListener("click", swallow, { capture: true }), 0);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const cardIndexOf = (el: Element | null) => {
    const cards = Array.from(trackRef.current?.querySelectorAll<HTMLElement>("[data-feature-card]") ?? []);
    return cards.findIndex((c) => c === el || c.contains(el));
  };

  // Arrow keys move the focus (and thereby the scroll position) to the neighbouring card.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const cards = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-feature-card]"));
    const current = cardIndexOf(document.activeElement);
    const nextIndex = (current < 0 ? (e.key === "ArrowRight" ? -1 : cards.length) : current) + (e.key === "ArrowRight" ? 1 : -1);
    const next = cards[nextIndex];
    if (!next) return;
    e.preventDefault();
    next.focus({ preventScroll: true });
    if (pinned) goToCard(nextIndex);
    else next.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", inline: "start", block: "nearest" });
  };

  const arrow = "feature-nav flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-site-surface/90 text-white/80 transition duration-300 hover:border-coral hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral aria-disabled:pointer-events-none aria-disabled:opacity-30";
  const fade = { "--fs-fade-l": edge.start ? "0px" : "100px", "--fs-fade-r": edge.end ? "0px" : "100px" } as CSSProperties;

  return (
    <section ref={wrapRef} className={`feature-section ${pinned ? "relative" : ""}`} data-testid="features" data-pinned={pinned || undefined} aria-labelledby={headingId}>
      <div className={`site-section mx-auto max-w-6xl px-5 sm:px-8 ${pinned ? "sticky top-0" : ""}`}>
        <div className="site-head flex items-end justify-between gap-6">
          <div>
            <h2 id={headingId}>{labels.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <div className="hidden shrink-0 gap-2 lg:flex" data-testid="features-arrows">
            <button type="button" className={arrow} onClick={() => goToCard(currentIndex() - 1)} aria-disabled={edge.start} tabIndex={edge.start ? -1 : 0} aria-label={labels.prev} data-testid="features-prev">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" className={arrow} onClick={() => goToCard(currentIndex() + 1)} aria-disabled={edge.end} tabIndex={edge.end ? -1 : 0} aria-label={labels.next} data-testid="features-next">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        <div className="group relative" role="region" aria-roledescription="carousel" aria-label={labels.title} data-testid="features-slider">
          <noscript>
            <style>{`.feature-track{grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));overflow:visible}.feature-nav{display:none}.feature-viewport{mask-image:none}`}</style>
          </noscript>
          {/* Full-bleed viewport: the track runs edge to edge, its gutters keep the first card flush with the heading. */}
          <div ref={viewportRef} className={`feature-viewport ${pinned ? "overflow-hidden" : ""}`} style={fade}>
            <ul
              ref={trackRef}
              className="feature-track grid cursor-grab select-none grid-flow-col gap-5 overflow-x-auto py-1.5 [grid-auto-columns:86%] active:cursor-grabbing sm:[grid-auto-columns:calc((100%_-_1.25rem)/2.15)] lg:[grid-auto-columns:calc((100%_-_2.5rem)/3.45)]"
              style={pinned ? { overflowX: "visible", scrollSnapType: "none", willChange: "transform" } : undefined}
              onPointerDown={onPointerDown}
              onKeyDown={onKeyDown}
              data-testid="features-track"
            >
              {FEATURE_KEYS.map((key, i) => (
                <li key={key} role="group" aria-roledescription="slide" aria-label={`${fmt(labels.slide, { n: i + 1, total })}: ${labels.items[key].title}`} className="snap-start">
                  <FeatureCard id={key} title={labels.items[key].title} text={labels.items[key].text} index={i} />
                </li>
              ))}
            </ul>
          </div>
          {pinned ? (
            <div className="mt-6 h-px w-full bg-white/10" aria-hidden data-testid="features-progress">
              <div ref={barRef} className="h-px w-full origin-left bg-coral" style={{ transform: "scaleX(0)" }} />
            </div>
          ) : null}
          <ol className="feature-nav mt-3 flex justify-center gap-1.5 lg:hidden" data-testid="features-dots">
            {FEATURE_KEYS.map((key, i) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => goToCard(i)}
                  className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-[18px] bg-coral" : "w-1.5 bg-white/20"}`}
                  aria-label={fmt(labels.goTo, { n: i + 1, total })}
                  aria-current={i === index ? "true" : undefined}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Stage with a coral glow at the bottom over the raised ink, as in the reference design. */
const STAGE_BG: CSSProperties = {
  background: "radial-gradient(circle at 50% 120%, rgb(var(--coral-rgb) / 0.16), transparent 55%), linear-gradient(180deg, var(--site-raise), var(--site-surface))",
};

/** Variant «Bühne»: illustration stage on top, then icon ring, title and copy. */
function FeatureCard({ id, title, text, index }: { id: FeatureKey; title: string; text: string; index: number }) {
  const Icon = ICONS[id];
  return (
    <article
      tabIndex={0}
      data-feature-card
      style={{ "--fa-delay": `${-(index * 0.9)}s` } as CSSProperties}
      className="flex h-full flex-col overflow-hidden rounded-[26px] border border-site-line bg-site-surface transition duration-300 ease-out hover:-translate-y-0.5 hover:border-coral/55 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] focus-visible:border-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="relative h-[170px] shrink-0 overflow-hidden border-b border-site-line sm:h-[190px]" style={STAGE_BG} data-testid="feature-stage">
        {/* Inline illustration, so its animated elements can pause off screen and react to hover. */}
        <div className="feature-art-inline absolute inset-0 [&>svg]:h-full [&>svg]:w-full" data-testid="feature-art">
          <FeatureArt id={id} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-8 pt-7 lg:p-9 lg:pt-8">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-white/15 text-coral">
          <Icon className="h-[22px] w-[22px]" aria-hidden />
        </span>
        <h3 className="mt-6 text-[22px] font-semibold leading-tight tracking-[-0.01em]">{title}</h3>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-white/65">{text}</p>
      </div>
    </article>
  );
}
