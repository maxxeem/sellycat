import type { ReactNode } from "react";

/**
 * Neutral device mockups (ported from the reference landing): no vendor cues (no notch, island, buttons or
 * logos), a dark rounded slab with a thin light edge. The screen content is drawn in code.
 */
type Common = { children: ReactNode; className?: string; shadow?: boolean; label?: string; compact?: boolean };

/** Phone: rounded slab with a 6 px bezel, width via className; screen ratio of a current phone (9:19.5). */
export function PhoneFrame({ children, className = "w-[280px]", shadow = true, label, compact = false }: Common) {
  const outer = compact ? "rounded-[1.6rem]" : "rounded-[2.6rem]";
  return (
    <div className={`relative aspect-[1179/2556] shrink-0 bg-site-device ring-1 ring-white/15 ${outer} ${shadow ? "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]" : ""} ${className}`} data-testid="phone-frame" aria-label={label} role={label ? "img" : undefined}>
      <div className={`absolute ${compact ? "inset-[4px] rounded-[1.35rem]" : "inset-[6px] rounded-[2.2rem]"} overflow-hidden bg-black`}>{children}</div>
      <span className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5 ${outer}`} aria-hidden />
    </div>
  );
}

/** 14-inch notebook: screen 3024×1964, thin bezel, flat base line, no logo. Width via className. */
export function LaptopFrame({ children, className = "w-[640px]", shadow = true, label }: Common) {
  return (
    <div className={`relative shrink-0 ${className}`} data-testid="laptop-frame" aria-label={label} role={label ? "img" : undefined}>
      <div className={`relative aspect-[3024/1964] rounded-[1.4rem] bg-site-device ring-1 ring-white/15 ${shadow ? "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]" : ""}`}>
        <div className="absolute inset-[8px] overflow-hidden rounded-[0.9rem] bg-black">{children}</div>
      </div>
      <div className="mx-auto mt-[2px] h-[10px] w-[112%] max-w-none -translate-x-[6%] rounded-b-xl rounded-t-[3px] bg-gradient-to-b from-site-line to-site-device ring-1 ring-white/10" aria-hidden>
        <div className="mx-auto h-[3px] w-[14%] rounded-b-md bg-white/10" />
      </div>
    </div>
  );
}
