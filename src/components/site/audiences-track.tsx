"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import type { Dictionary } from "@/lib/i18n";
import agencies from "../../../public/site/audiences/agencies.jpg";
import city from "../../../public/site/audiences/city.jpg";
import clubs from "../../../public/site/audiences/clubs.jpg";
import media from "../../../public/site/audiences/media.jpg";
import retail from "../../../public/site/audiences/retail.jpg";

type Labels = Dictionary["site"]["audiences"];

/**
 * One photo per audience, in the order of `labels.tiles` (chosen by Jan, web-sized copies in
 * public/site/audiences): TV heads (media), golf (clubs), a fjord (city & tourism), a shared table
 * (retail & hospitality), a floating type book with colour fan and headphones (agencies). `focus` keeps the subject in the
 * portrait crop and above the type.
 */
const PHOTOS: { id: string; src: StaticImageData; focus: string }[] = [
  { id: "aud-media", src: media, focus: "21% 40%" },
  { id: "aud-clubs", src: clubs, focus: "34% 50%" },
  { id: "aud-city", src: city, focus: "50% 35%" },
  { id: "aud-retail", src: retail, focus: "50% 40%" },
  { id: "aud-agency", src: agencies, focus: "50% 40%" },
];

/**
 * Audiences as one wide row of 9:16 tiles (edges cut off, arrows top right on desktop): one deal photo
 * per tile, the audience and one line in large type over a dark gradient.
 */
export function AudiencesTrack({ labels }: { labels: Labels }) {
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
  const arrow = "flex h-11 w-11 items-center justify-center rounded-full border border-fg/15 bg-site-surface/90 text-fg/80 transition duration-300 hover:border-coral hover:text-coral-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral aria-disabled:pointer-events-none aria-disabled:opacity-30";
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
            const photo = PHOTOS[i % PHOTOS.length];
            return (
              <li key={tile.name} className="w-[62vw] max-w-[300px] shrink-0 snap-start sm:w-[240px] lg:w-[280px]">
                <AudienceTile name={tile.name} text={tile.text} photo={photo} />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function AudienceTile({ name, text, photo }: { name: string; text: string; photo: (typeof PHOTOS)[number] }) {
  return (
    <div className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-site-surface ring-1 ring-fg/10" data-testid={`audience-${photo.id}`}>
      {/* The photo slowly leans in on hover (transform only; still with reduced motion). */}
      <span className="absolute inset-0 block transition-transform duration-[1400ms] ease-out motion-safe:group-hover:scale-[1.05]">
        <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 280px, (min-width: 640px) 240px, 62vw" quality={75} placeholder="blur" draggable={false} className="object-cover" style={{ objectPosition: photo.focus }} />
      </span>
      {/* A deep, even gradient over the lower half: the type always sits on a calm, dark ground. */}
      <span className="absolute inset-x-0 bottom-0 flex h-[58%] flex-col justify-end gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 sm:p-6">
        {/* Title on one line, text on exactly two (texts are written to fit every tile width). */}
        <span className="truncate text-lg font-semibold leading-tight tracking-[-0.01em] text-white lg:text-xl" data-testid="audience-title">{name}</span>
        <span className="line-clamp-2 min-h-[2lh] text-sm leading-snug text-white/85" data-testid="audience-text">{text}</span>
      </span>
    </div>
  );
}
