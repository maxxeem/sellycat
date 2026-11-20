"use client";

import { useEffect, useRef } from "react";

/**
 * Soft colour drift behind a section, driven by scroll (ported from the reference landing): while the section travels
 * through the viewport a progress value 0→1→0 moves pre-blurred radial fields (ember, warm grey, a hint of
 * coral) across the background. Only transform/opacity change; reduced motion freezes it at the mid state.
 */
export function ScrollGlow({ children, className = "", testId = "steps" }: { children: React.ReactNode; className?: string; testId?: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--glow", "0.6");
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const centre = r.top + r.height / 2;
      const t = 1 - Math.min(1, Math.abs(centre - vh / 2) / (vh / 2 + r.height / 2));
      el.style.setProperty("--glow", t.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <section ref={root} className={`scroll-glow relative ${className}`} data-testid={testId}>
      <div className="pointer-events-none absolute inset-x-0 -top-[40vh] -bottom-[40vh] -z-10" aria-hidden>
        <span className="glow-a absolute left-[-20%] top-[5%] h-[80vmax] w-[80vmax] rounded-full" />
        <span className="glow-b absolute right-[-25%] top-[35%] h-[70vmax] w-[70vmax] rounded-full" />
        <span className="glow-c absolute left-[35%] top-[50%] h-[45vmax] w-[45vmax] rounded-full" />
      </div>
      {children}
    </section>
  );
}
