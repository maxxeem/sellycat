"use client";

import { Check, Lock, Mail, Menu, Wallet, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { DEMO_BRANDS, DEMO_DEALS, DealArt, chf, discount } from "./demo-brands";
import { At, Fill, Finger, useDemo, useScenes, useTicker } from "./demo-kit";
import { PhoneFrame } from "./device-frames";

type Labels = Dictionary["site"]["bands"];
type Locale = "de" | "en";

/**
 * The big phone of the bands block: «purchase → voucher» in a loop. A fictional shop (Lumen Magazin) shows a
 * deal with «only 7 left» and a running countdown; a finger taps «Buy», a checkout sheet slides up with a
 * generic wallet pay button, the payment spins, «Paid» confirms, then the PDF voucher (by mail) and the
 * wallet pass with its QR code fly in; back in the shop the counter shows 6. Drawn at 390 px design width
 * inside the phone's screen (technique of the reference PhoneStoryDemo); a caption under the phone names the step.
 */
const SCENES = [3200, 2600, 1500, 1900, 4400, 2800];
const [SHOP, SHEET, PROCESS, PAID, VOUCHER, BACK] = SCENES.map((_, i) => i);

const BRAND = DEMO_BRANDS[0];
const DEAL = DEMO_DEALS[0];
/** Stock bar: the deal's original quantity (fictional), so «7 left» fills a small part of the bar. */
const STOCK = 40;
const CODE = "LUMEN-7K2M-Q9XA";
const COUNTDOWN_START = 2 * 86400 + 9 * 3600 + 41 * 60 + 12;

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

export function PhoneBuyDemo({ labels, locale, className = "h-[520px] w-[240px] xl:h-[585px] xl:w-[270px]", caption = true }: { labels: Labels; locale: Locale; className?: string; caption?: boolean }) {
  const { running, reduced, ref } = useDemo("40px");
  const { index, cycle } = useScenes(SCENES, running);
  // Reduced motion: a still of the result (voucher and wallet pass) says more than the first scene.
  const scene = reduced ? VOUCHER : index;
  return (
    <div ref={ref} className="relative" data-testid="phone-buy-demo" data-scene={scene}>
      <PhoneFrame className={className}>
        <Fill width={390}>
          <Screen scene={scene} cycle={cycle} running={running} l={labels} locale={locale} />
        </Fill>
      </PhoneFrame>
      {caption ? (
        <div className="absolute left-1/2 top-full mt-5 flex -translate-x-1/2 justify-center whitespace-nowrap">
          <span key={scene} className="demo-in inline-flex items-center gap-2 rounded-full border border-fg/10 bg-site-surface/80 px-3.5 py-1.5 text-[13px] font-medium text-fg/85 backdrop-blur" data-testid="phone-buy-demo-caption">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            {labels.captions[scene]}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Screen({ scene, cycle, running, l, locale }: { scene: number; cycle: number; running: boolean; l: Labels; locale: Locale }) {
  const seconds = useTicker(running, 1000);
  const sheetOpen = scene === SHEET || scene === PROCESS || scene === PAID;
  return (
    <div className="demo-root relative h-full w-full overflow-hidden" style={{ background: BRAND.surface, color: BRAND.ink, fontFamily: BRAND.font }} data-running={running ? "1" : "0"}>
      <Shop l={l} locale={locale} seconds={seconds} left={scene === BACK ? DEAL.left - 1 : DEAL.left} sold={scene === BACK} tap={scene === SHOP} cycle={cycle} />
      {sheetOpen ? <Sheet key={scene === SHEET ? `open${cycle}` : "sheet"} scene={scene} cycle={cycle} l={l} locale={locale} /> : null}
      {scene === VOUCHER ? <Vouchers key={`v${cycle}`} l={l} locale={locale} /> : null}
    </div>
  );
}

/* ---------- The fictional shop ---------- */

function Shop({ l, locale, seconds, left, sold, tap, cycle }: { l: Labels; locale: Locale; seconds: number; left: number; sold: boolean; tap: boolean; cycle: number }) {
  const u = l.ui;
  return (
    <div className="absolute inset-0 flex flex-col">
      <StatusBar />
      <div className="shrink-0 px-4 pb-2">
        <span className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-black/[0.06] text-[13px] opacity-75">
          <Lock className="h-3 w-3" />
          {BRAND.domain}
        </span>
      </div>
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <ShopLogo />
        <Menu className="h-5 w-5 opacity-60" />
      </div>
      <div className="flex shrink-0 gap-2 overflow-hidden px-4 pb-3">
        {u.categories.map((c, i) => (
          <span key={c} className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold" style={i === 0 ? { background: BRAND.primary, color: BRAND.onPrimary } : { background: "#fff" }}>
            {c}
          </span>
        ))}
      </div>

      <div className="mx-4 overflow-hidden bg-white shadow-[0_10px_30px_-12px_rgba(27,16,51,0.25)]" style={{ borderRadius: BRAND.radius }}>
        <div className="relative h-[190px]">
          <DealArt deal={{ ...DEAL, id: "buy-demo-main" }} />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-bold text-white">−{discount(DEAL)} %</span>
        </div>
        <div className="p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-55">{DEAL.partner}</p>
          <p className="mt-1 text-[21px] font-bold leading-tight">{DEAL.title[locale]}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[22px] font-bold" style={{ color: BRAND.primary }}>{chf(DEAL.priceCents)}</span>
            <span className="text-[14px] line-through opacity-45">{chf(DEAL.valueCents)}</span>
          </p>
          {/* Stock: «only n left» with a short bar; in the last scene the number drops by one. */}
          <div className="mt-3">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: BRAND.primaryText ?? BRAND.primary }}>
              <span className="tour-live h-2 w-2 rounded-full" style={{ background: BRAND.primary }} />
              <span key={left} className={sold ? "demo-in" : undefined} style={sold ? { ["--d" as string]: "500ms" } : undefined}>
                {fill(u.onlyLeft, { n: left })}
              </span>
            </span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
              <span className="block h-full rounded-full" style={{ width: `${(left / STOCK) * 100}%`, background: BRAND.primary }} />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] font-medium opacity-60">{u.endsIn}</span>
            <span className="flex gap-1.5">
              {countdown(seconds).map((v, i) => (
                <span key={i} className="flex min-w-[40px] flex-col items-center rounded-lg bg-black/[0.05] px-1.5 py-1">
                  <span className="text-[16px] font-bold tabular-nums leading-tight">{v}</span>
                  <span className="text-[9px] font-medium uppercase opacity-55">{u.units[i]}</span>
                </span>
              ))}
            </span>
          </div>
          <div className="relative mt-4">
            <span className="flex h-[50px] items-center justify-center text-[16px] font-bold" style={{ background: BRAND.primary, color: BRAND.onPrimary, borderRadius: BRAND.radius - 6 }}>
              {u.buy} · {chf(DEAL.priceCents)}
            </span>
            {tap ? <Finger key={`buy${cycle}`} x={163} y={25} at={2400} /> : null}
          </div>
        </div>
      </div>

      {sold ? (
        <At key={`sold${cycle}`} at={300} className="absolute inset-x-0 top-[52px] z-10 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold shadow-lg" style={{ background: BRAND.ink, color: "#fff" }}>
            <Check className="h-4 w-4" />
            {u.sold}
          </span>
        </At>
      ) : null}
      <HomeIndicator />
    </div>
  );
}

function ShopLogo({ light = false }: { light?: boolean }) {
  const fg = light ? BRAND.primary : BRAND.onPrimary;
  return (
    <span className="inline-flex items-center gap-2" style={{ color: light ? "#fff" : BRAND.ink }}>
      <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="7" fill={light ? "#fff" : BRAND.primary} />
        <path d="M5 13c2-3 4-3 6 0s4 3 6 0" stroke={fg} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-[18px] font-bold tracking-tight">{BRAND.name}</span>
    </span>
  );
}

/* ---------- Checkout sheet: pay, processing, paid ---------- */

function Sheet({ scene, cycle, l, locale }: { scene: number; cycle: number; l: Labels; locale: Locale }) {
  const u = l.ui;
  const opening = scene === SHEET;
  return (
    <div className="absolute inset-0 z-20">
      <span className={`absolute inset-0 bg-black/45 ${opening ? "demo-in" : ""}`} />
      <div className={`absolute inset-x-0 bottom-0 flex min-h-[470px] flex-col rounded-t-[28px] bg-white px-5 pb-10 pt-3 ${opening ? "demo-sheet" : ""}`} style={{ ["--d" as string]: "120ms" }}>
        <span className="mx-auto mb-4 block h-1 w-10 shrink-0 rounded-full bg-black/15" />
        {scene === PAID ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <At at={80}>
              <span className="grid h-[84px] w-[84px] place-items-center rounded-full" style={{ background: BRAND.primary, color: BRAND.onPrimary }}>
                <Check className="h-11 w-11" strokeWidth={3} />
              </span>
            </At>
            <At at={300}>
              <p className="mt-5 text-[28px] font-bold">{u.paid}</p>
              <p className="mt-1 text-[15px] opacity-60">{u.paidText}</p>
              <p className="mt-4 text-[17px] font-semibold">{chf(DEAL.priceCents)}</p>
            </At>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[20px] font-bold">{u.checkout}</p>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.06]"><X className="h-4 w-4" /></span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"><DealArt deal={{ ...DEAL, id: "buy-demo-sheet" }} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{DEAL.title[locale]}</span>
                <span className="block truncate text-[13px] opacity-55">{DEAL.partner}</span>
              </span>
              <span className="text-[15px] font-semibold">{chf(DEAL.priceCents)}</span>
            </div>
            <div className="mt-4 divide-y divide-black/[0.07] border-y border-black/[0.07] text-[14px]">
              <p className="flex justify-between py-2.5"><span className="opacity-60">{u.quantity}</span><span className="font-medium">1</span></p>
              <p className="flex justify-between py-2.5"><span className="opacity-60">{u.total}</span><span className="font-bold">{chf(DEAL.priceCents)}</span></p>
            </div>
            <p className="mt-4 text-[12px] font-medium opacity-60">{u.email}</p>
            <p className="mt-1 rounded-xl bg-black/[0.05] px-3.5 py-3 text-[15px]">{u.emailValue}</p>
            {/* Generic wallet pay button (no vendor logo). */}
            <div className="relative mt-5">
              <span className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-black text-white">
                {scene === PROCESS ? (
                  <>
                    <span className="demo-spin h-5 w-5 rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-[15px] font-medium">{u.processing}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-[22px] w-[22px]" />
                    <span className="text-[21px] font-semibold tracking-tight">{u.pay}</span>
                  </>
                )}
              </span>
              {opening ? <Finger key={`pay${cycle}`} x={175} y={27} at={1800} /> : null}
            </div>
            <p className="mt-3 text-center text-[13px] font-medium" style={{ color: BRAND.primaryText ?? BRAND.primary }}>{u.card}</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] opacity-50">
              <Lock className="h-3 w-3" />
              {fill(u.direct, { shop: BRAND.name })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Result: PDF by mail and wallet pass ---------- */

function Vouchers({ l, locale }: { l: Labels; locale: Locale }) {
  const u = l.ui;
  return (
    <div className="demo-in absolute inset-0 z-30 flex flex-col items-center" style={{ background: "#ECE8F6" }}>
      <StatusBar />
      <At at={200} className="w-full px-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.25)]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: BRAND.primary, color: BRAND.onPrimary }}><Mail className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex justify-between text-[13px]"><span className="font-bold">{BRAND.name}</span><span className="opacity-45">{u.now}</span></span>
            <span className="block truncate text-[13px] opacity-75">{u.mailSubject}</span>
          </span>
        </div>
      </At>

      {/* The PDF voucher (attachment of the mail). */}
      <div className="demo-fly mt-4 w-[330px]" style={{ ["--d" as string]: "700ms", ["--fx" as string]: "-90px", ["--fy" as string]: "40px", ["--fr" as string]: "-12deg" }}>
        <div className="flex h-[112px] -rotate-2 overflow-hidden rounded-xl bg-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.35)]">
          <span className="w-[104px] shrink-0"><DealArt deal={{ ...DEAL, id: "buy-demo-pdf" }} /></span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3.5">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-55">
              {u.voucher}
              <span className="rounded px-1.5 py-px text-[10px] text-white" style={{ background: "#D93A2B" }}>PDF</span>
            </span>
            <span className="truncate text-[16px] font-bold">{DEAL.title[locale]}</span>
            <span className="text-[12px] opacity-60">{u.value} {chf(DEAL.valueCents)}</span>
            <span className="font-mono text-[12px] font-semibold tracking-wider">{CODE}</span>
          </span>
        </div>
      </div>

      {/* The wallet pass with its QR code. */}
      <div className="demo-fly mt-4 w-[300px]" style={{ ["--d" as string]: "1300ms", ["--fx" as string]: "90px", ["--fy" as string]: "80px", ["--fr" as string]: "10deg" }}>
        <div className="rounded-[18px] p-4 text-white shadow-[0_20px_40px_-14px_rgba(27,16,51,0.55)]" style={{ background: BRAND.primary }}>
          <div className="flex items-center justify-between">
            <ShopLogo light />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-80">{u.voucher}</span>
          </div>
          <p className="mt-3 text-[19px] font-bold leading-tight">{DEAL.title[locale]}</p>
          <div className="mt-2 flex gap-6 text-[12px]">
            <span><span className="block opacity-70">{u.value}</span><span className="font-semibold">{chf(DEAL.valueCents)}</span></span>
            <span><span className="block opacity-70">{u.validUntil}</span><span className="font-semibold">{u.validDate}</span></span>
          </div>
          <div className="mx-auto mt-3 w-[156px] rounded-xl bg-white p-2.5" style={{ color: BRAND.ink }}>
            <FakeQr />
            <p className="mt-1 text-center font-mono text-[10px] font-semibold tracking-wider">{CODE}</p>
          </div>
        </div>
      </div>

      <At at={2100} className="relative mt-4">
        <span className="flex h-11 items-center gap-2 rounded-full bg-black px-5 text-[14px] font-semibold text-white">
          <Wallet className="h-4 w-4" />
          {u.addToWallet}
        </span>
        <At at={3300} className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-full bg-black text-[14px] font-semibold text-white">
          <Check className="h-4 w-4" />
          {u.added}
        </At>
        <Finger x={90} y={22} at={3100} />
      </At>
      <HomeIndicator />
    </div>
  );
}

/** A made-up QR-like pattern (deterministic, three finder squares): decorative, it encodes nothing. */
const QR_SIZE = 25;
const QR_FINDERS: [number, number][] = [[0, 0], [QR_SIZE - 7, 0], [0, QR_SIZE - 7]];
const QR_PATH = (() => {
  let d = "";
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      const finder = QR_FINDERS.find(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
      let on: boolean;
      if (finder) {
        const dx = x - finder[0];
        const dy = y - finder[1];
        const inside = dx >= 0 && dy >= 0 && dx <= 6 && dy <= 6;
        on = inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      } else {
        on = ((x * 31 + y * 17 + x * y * 7) ^ (x + y * 3)) % 7 < 3;
      }
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
})();

function FakeQr() {
  return (
    <svg viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`} className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden>
      <path d={QR_PATH} fill="currentColor" />
    </svg>
  );
}

/* ---------- Phone chrome ---------- */

function StatusBar() {
  return (
    <div className="flex h-11 w-full shrink-0 items-center justify-between px-7 pt-1 text-[14px] font-semibold">
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <span className="flex items-end gap-[2px]">{[5, 7, 9, 11].map((h) => <span key={h} className="w-[3px] rounded-sm bg-current" style={{ height: h }} />)}</span>
        <span className="ml-1 h-[11px] w-[22px] rounded-[3px] border border-current p-[1.5px]"><span className="block h-full w-[70%] rounded-[1px] bg-current" /></span>
      </span>
    </div>
  );
}

function HomeIndicator() {
  return <span className="absolute bottom-2 left-1/2 z-40 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/80" />;
}

function countdown(elapsed: number) {
  const left = Math.max(0, COUNTDOWN_START - elapsed);
  return [Math.floor(left / 86400), Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0"));
}
