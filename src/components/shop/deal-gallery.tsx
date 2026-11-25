"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { shopImage } from "@/lib/shop/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmt } from "@/lib/i18n/fmt";
import type { ShopTexts } from "./shop-texts";

type Picture = { url: string; alt?: string | null };

const noBar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Scrolls a snap track to slide `i` (each slide is as wide as the track). */
function goTo(track: HTMLElement | null, i: number, smooth = true) {
  track?.scrollTo({ left: i * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
}

/** Index of the slide currently shown by a snap track. */
const current = (track: HTMLElement) => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));

/**
 * Deal pictures: a swipeable slideshow with arrows and thumbnails; a click opens the picture full
 * screen, where the slideshow continues (swipe, arrows, keyboard).
 */
export function DealGallery({ images, title, t }: { images: Picture[]; title: string; t: ShopTexts }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const many = images.length > 1;

  if (!images.length) return <div className="aspect-[16/10] w-full rounded-[var(--shop-radius)] bg-[var(--shop-surface)]" />;

  const show = (i: number) => {
    const next = (i + images.length) % images.length;
    setIndex(next);
    goTo(track.current, next);
  };

  return (
    <div>
      <div className="group relative overflow-hidden rounded-[var(--shop-radius)] bg-[var(--shop-surface)]">
        <div ref={track} onScroll={(e) => setIndex(current(e.currentTarget))} className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${noBar}`}>
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setZoom(i)} className="relative w-full shrink-0 snap-center cursor-zoom-in" aria-label={fmt(t.galleryOpen, { n: i + 1 })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...shopImage(img.url, "(min-width: 1024px) 60vw, 100vw")} alt={img.alt || title} className="aspect-[16/10] w-full object-cover" loading={i ? "lazy" : "eager"} fetchPriority={i ? "auto" : "high"} draggable={false} />
            </button>
          ))}
        </div>
        {many ? (
          <>
            <Arrow side="left" label={t.galleryPrev} onClick={() => show(index - 1)} className="hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" />
            <Arrow side="right" label={t.galleryNext} onClick={() => show(index + 1)} className="hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" />
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
              {fmt(t.galleryCount, { n: index + 1, total: images.length })}
            </span>
          </>
        ) : (
          <span className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white" aria-hidden>
            <Expand className="h-4 w-4" />
          </span>
        )}
      </div>

      {many ? (
        <div className={`mt-3 flex gap-2 overflow-x-auto pb-1 ${noBar}`}>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => show(i)}
              aria-label={fmt(t.galleryOpen, { n: i + 1 })}
              aria-current={i === index}
              className={`w-20 shrink-0 overflow-hidden rounded-[var(--shop-radius)] border-2 transition sm:w-24 ${i === index ? "border-[var(--shop-primary)]" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...shopImage(img.url, "96px")} alt="" loading="lazy" className="aspect-square w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}

      {zoom !== null ? (
        <Lightbox
          images={images}
          title={title}
          start={zoom}
          t={t}
          onClose={(last) => {
            setZoom(null);
            setIndex(last);
            goTo(track.current, last, false);
          }}
        />
      ) : null}
    </div>
  );
}

function Arrow({ side, label, onClick, className = "", dark = false }: { side: "left" | "right"; label: string; onClick: () => void; className?: string; dark?: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition ${side === "left" ? "left-3" : "right-3"} ${dark ? "bg-white/15 text-white hover:bg-white/25" : "bg-white/90 text-black shadow-md hover:bg-white"} ${className}`}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}

/** Full-screen slideshow. Works inside the editor's preview frame too (uses its own document). */
function Lightbox({ images, title, start, t, onClose }: { images: Picture[]; title: string; start: number; t: ShopTexts; onClose: (index: number) => void }) {
  const [index, setIndex] = useState(start);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const many = images.length > 1;
  const show = (i: number) => {
    const next = (i + images.length) % images.length;
    setIndex(next);
    goTo(track.current, next);
  };
  // Latest handlers for the keyboard listener.
  const keys = useRef({ show, close: () => onClose(index), index });
  useEffect(() => {
    keys.current = { show, close: () => onClose(index), index };
  });

  useLayoutEffect(() => {
    goTo(track.current, start, false);
    root.current?.focus();
  }, [start]);

  // Keyboard and no page scrolling underneath while open.
  useEffect(() => {
    const doc = root.current?.ownerDocument;
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (e.key === "Escape") k.close();
      else if (e.key === "ArrowLeft") k.show(k.index - 1);
      else if (e.key === "ArrowRight") k.show(k.index + 1);
    };
    const before = doc.documentElement.style.overflow;
    doc.documentElement.style.setProperty("overflow", "hidden");
    doc.addEventListener("keydown", onKey);
    return () => {
      doc.removeEventListener("keydown", onKey);
      doc.documentElement.style.setProperty("overflow", before);
    };
  }, []);

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="fixed inset-0 z-[100] flex flex-col bg-black text-white outline-none">
      <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-sm font-semibold tabular-nums">{many ? fmt(t.galleryCount, { n: index + 1, total: images.length }) : ""}</span>
        <button type="button" onClick={() => onClose(index)} aria-label={t.galleryClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={track} onScroll={(e) => setIndex(current(e.currentTarget))} className={`flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain ${noBar}`}>
          {images.map((img, i) => (
            <div key={img.url} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2 sm:px-20 sm:py-4" onClick={(e) => e.target === e.currentTarget && onClose(index)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...shopImage(img.url, "100vw")} alt={img.alt || title} className="max-h-full max-w-full select-none object-contain" loading={Math.abs(i - start) > 1 ? "lazy" : "eager"} draggable={false} />
            </div>
          ))}
        </div>
        {many ? (
          <>
            <Arrow side="left" dark label={t.galleryPrev} onClick={() => show(index - 1)} className="hidden sm:flex" />
            <Arrow side="right" dark label={t.galleryNext} onClick={() => show(index + 1)} className="hidden sm:flex" />
          </>
        ) : null}
      </div>
      {many ? (
        <div className={`flex justify-center gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${noBar}`}>
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => show(i)} aria-label={fmt(t.galleryOpen, { n: i + 1 })} aria-current={i === index} className={`w-14 shrink-0 overflow-hidden rounded-md border-2 transition ${i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...shopImage(img.url, "96px")} alt="" loading="lazy" className="aspect-square w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
