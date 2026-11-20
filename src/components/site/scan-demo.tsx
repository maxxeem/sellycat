"use client";

import { Check, ChevronsRight, Lock, ScanLine, Wallet, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { At, Finger } from "./demo-kit";
import { DEMO_BRANDS, DEMO_DEALS, DealArt, chf } from "./demo-brands";
import "./scan.css";

type Screen = Dictionary["site"]["scan"]["screen"];

/**
 * «Scan & check» on a phone, drawn at 390 px design width (inside `Fill`): the camera finds the voucher's
 * QR code, the check page in the light Sellycat look shows «Valid», a swipe redeems it, and the buyer's
 * wallet pass slides in with the new state. Three scenes in a loop (`useScenes` in app-showcase.tsx).
 */
export const SCAN_SCENES = [3400, 4400, 4200];
export const [SCAN, CHECK, WALLET] = SCAN_SCENES.map((_, i) => i);

const DEAL = DEMO_DEALS[0]; // Brunch for two · Café Kater
const SHOP = DEMO_BRANDS[0]; // sold in Lumen Magazin's deal shop
const CODE = "BRN-4K7Q-92";
const INK = "var(--ink-brand)";
const GRAY = "var(--gray)";

export function ScanScreen({ scene, cycle, running, s, locale }: { scene: number; cycle: number; running: boolean; s: Screen; locale: "de" | "en" }) {
  const title = DEAL.title[locale];
  return (
    <div className="demo-root relative h-full w-full overflow-hidden bg-site-ground text-white" data-running={running ? "1" : "0"}>
      <div key={`${scene}-${cycle}`} className="demo-in absolute inset-0">
        {scene === SCAN ? <Camera s={s} title={title} /> : null}
        {scene === CHECK ? <CheckPage s={s} title={title} animate /> : null}
        {scene === WALLET ? (
          <>
            <CheckPage s={s} title={title} animate={false} />
            <At at={150} className="absolute inset-0 bg-black/35" />
            <At at={400} className="absolute inset-x-4 top-5 z-10 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl" style={{ color: INK }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: INK }}><Wallet className="h-5 w-5" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold">{s.wallet}</span>
                <span className="block text-[15px]">{s.updated}</span>
              </span>
            </At>
            <Pass s={s} title={title} />
          </>
        ) : null}
      </div>
    </div>
  );
}

/** The browser's address bar: the check page is a web page, no app. */
function AddressBar({ light }: { light: boolean }) {
  return (
    <div className={`absolute inset-x-4 top-5 flex h-11 items-center justify-center gap-2 rounded-full text-[15px] ${light ? "bg-white shadow-sm" : "bg-white/15 text-white/85"}`} style={light ? { color: INK } : undefined}>
      <Lock className="h-3.5 w-3.5 opacity-60" aria-hidden />
      {SHOP.domain}/scan
    </div>
  );
}

function Camera({ s, title }: { s: Screen; title: string }) {
  return (
    <>
      {/* The camera feed: a voucher on a café table. */}
      <span className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% 40%, #5a4636 0%, #2b2019 55%, #120d0a 100%)" }} />
      <AddressBar light={false} />
      <div className="absolute left-1/2 top-[84px] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-[15px] font-semibold">
        <ScanLine className="h-4 w-4 text-coral-text" aria-hidden />{s.scanTitle}
      </div>
      <span className="absolute right-6 top-[88px] grid h-8 w-8 place-items-center rounded-full bg-black/50"><X className="h-4 w-4" aria-hidden /></span>
      <div className="absolute left-1/2 top-[150px] w-[290px] -translate-x-1/2 rotate-[-3deg] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-10px_rgba(0,0,0,0.7)]" style={{ color: INK }}>
        <div className="h-[92px]"><DealArt deal={DEAL} /></div>
        <div className="px-5 pb-5 pt-3 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: GRAY }}>{s.voucher} · {DEAL.partner}</p>
          <p className="mt-1 text-[19px] font-bold leading-tight">{title}</p>
          <div className="relative mx-auto mt-3 h-[164px] w-[164px]">
            <Qr className="h-full w-full" />
            <At out={1700} className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="scan-sweep absolute inset-x-0 top-0 block h-[3px] bg-coral shadow-[0_0_14px_rgba(255,75,35,0.9)]" style={{ ["--h" as string]: "161px" }} />
            </At>
            <span className="scan-lock pointer-events-none absolute -inset-3 block" style={{ ["--d" as string]: "1500ms" }}>
              <Brackets />
            </span>
          </div>
          <p className="mt-2 font-mono text-[13px] tracking-wider" style={{ color: GRAY }}>{CODE}</p>
        </div>
      </div>
      <At out={1800} className="absolute inset-x-0 bottom-[120px] text-center text-[17px] text-white/80">{s.hint}</At>
      <At at={1900} className="absolute inset-x-0 bottom-[112px] flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[17px] font-semibold text-on-coral shadow-[0_0_40px_rgba(255,75,35,0.5)]">
          <Check className="h-5 w-5" strokeWidth={3} aria-hidden />{s.found}
        </span>
      </At>
    </>
  );
}

/** Four coral corners around the code. */
function Brackets() {
  const c = "absolute h-9 w-9 border-coral";
  return (
    <>
      <span className={`${c} left-0 top-0 rounded-tl-xl border-l-4 border-t-4`} />
      <span className={`${c} right-0 top-0 rounded-tr-xl border-r-4 border-t-4`} />
      <span className={`${c} bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4`} />
      <span className={`${c} bottom-0 right-0 rounded-br-xl border-b-4 border-r-4`} />
    </>
  );
}

/** Sellycat's check page (light look). `animate`: valid → swipe → redeemed; otherwise the redeemed state. */
function CheckPage({ s, title, animate }: { s: Screen; title: string; animate: boolean }) {
  const valid = (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#E3F5E8] px-4 py-2 text-[17px] font-bold text-[#157A3A]">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1E9E4A] text-white"><Check className="h-3.5 w-3.5" strokeWidth={3.5} aria-hidden /></span>
      {s.valid}
    </span>
  );
  const redeemed = (
    <span className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[17px] font-bold" style={{ background: "rgba(17,17,17,0.07)", color: INK }}>
      {s.redeemed}
      <span className="text-[14px] font-medium" style={{ color: GRAY }}>{s.time}</span>
    </span>
  );
  const rows: [string, string][] = [[s.code, CODE], [s.value, chf(DEAL.valueCents)], [s.shop, SHOP.name]];
  return (
    <div className="absolute inset-0" style={{ background: "var(--mist)", color: INK }}>
      <AddressBar light />
      <p className="absolute left-5 top-[86px] text-[24px] font-bold tracking-tight">{s.checkTitle}</p>
      <div className="absolute inset-x-5 top-[134px] rounded-3xl bg-white p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]">
        <div className="h-[160px] overflow-hidden rounded-2xl"><DealArt deal={DEAL} /></div>
        <p className="mt-4 text-[23px] font-bold leading-tight">{title}</p>
        <p className="text-[16px]" style={{ color: GRAY }}>{DEAL.partner}</p>
        <div className="relative mt-4 h-[42px]">
          {animate ? (
            <>
              <At out={2450} className="absolute left-0 top-0"><At at={350}>{valid}</At></At>
              <At at={2500} className="absolute left-0 top-0">{redeemed}</At>
            </>
          ) : (
            <span className="absolute left-0 top-0">{redeemed}</span>
          )}
        </div>
        <dl className="mt-4 border-t border-black/[0.07]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-black/[0.07] py-2.5 text-[16px] last:border-b-0">
              <dt style={{ color: GRAY }}>{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {/* Swipe to redeem */}
      <div className="absolute inset-x-5 bottom-10 h-[72px] overflow-hidden rounded-full bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
        {animate ? (
          <>
            <At out={1500} className="absolute inset-0 flex items-center justify-center pl-12 text-[17px] font-semibold" style={{ color: GRAY }}>{s.swipe}</At>
            <span className="scan-knob absolute left-1 top-1 grid h-16 w-16 place-items-center rounded-full bg-coral text-on-coral" style={{ ["--d" as string]: "1500ms", ["--to" as string]: "278px" }}>
              <ChevronsRight className="h-7 w-7" aria-hidden />
            </span>
            <At at={2350} className="absolute inset-0"><Done label={s.redeemed} /></At>
          </>
        ) : (
          <Done label={s.redeemed} />
        )}
      </div>
      {animate ? <Finger x={56} y={-76} at={1500} swipe={[278, 0]} /> : null}
    </div>
  );
}

function Done({ label }: { label: string }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-2 rounded-full text-[18px] font-semibold text-white" style={{ background: INK }}>
      <Check className="h-5 w-5" strokeWidth={3} aria-hidden />{label}
    </span>
  );
}

/** The buyer's wallet pass in the partner's colours, switched to «Redeemed». */
function Pass({ s, title }: { s: Screen; title: string }) {
  const dark = DEAL.hue[1];
  return (
    <div className="scan-pass absolute inset-x-6 bottom-6 z-10 overflow-hidden rounded-[28px] text-white shadow-[0_30px_60px_-10px_rgba(0,0,0,0.6)]" style={{ ["--d" as string]: "700ms", background: `linear-gradient(160deg, ${dark}, #5e2a14)` }}>
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="flex items-center gap-2.5">
          <span className="h-9 w-9 overflow-hidden rounded-lg ring-1 ring-white/30"><DealArt deal={{ ...DEAL, id: "brunch-pass" }} /></span>
          <span className="text-[17px] font-bold">{DEAL.partner}</span>
        </span>
        <span className="text-[13px] text-white/70">{s.voucher}</span>
      </div>
      <p className="mt-4 px-5 text-[23px] font-bold leading-tight">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{s.status}</p>
          <p className="text-[18px] font-bold">{s.redeemed}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{s.value}</p>
          <p className="text-[18px] font-bold">{chf(DEAL.valueCents)}</p>
        </div>
      </div>
      <div className="relative m-5 mt-4 flex flex-col items-center rounded-2xl bg-white py-4" style={{ color: INK }}>
        <Qr className="h-[110px] w-[110px] opacity-20" />
        <span className="absolute left-1/2 top-[38px] -translate-x-1/2 rotate-[-8deg] rounded-lg border-[3px] px-3 py-1 text-[18px] font-black uppercase tracking-wide" style={{ borderColor: dark, color: dark }}>
          {s.redeemed}
        </span>
        <span className="mt-2 text-[13px]" style={{ color: GRAY }}>{s.time}</span>
      </div>
    </div>
  );
}

/** A fixed, made-up QR-like pattern (finder squares, timing lines, seeded modules): looks like a code, encodes nothing. */
const QR_SIZE = 25;
const QR_PATH = (() => {
  const n = QR_SIZE;
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      const dx = x - fx;
      const dy = y - fy;
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
        const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return ring || core;
      }
    }
    return null;
  };
  let seed = 20261120;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      const on = f !== null ? f : y === 6 || x === 6 ? (x + y) % 2 === 0 : rnd() > 0.52;
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
})();

function Qr({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`} className={className} shapeRendering="crispEdges" aria-hidden>
      <rect x="-1" y="-1" width={QR_SIZE + 2} height={QR_SIZE + 2} fill="#fff" />
      <path d={QR_PATH} fill="#111" />
    </svg>
  );
}
