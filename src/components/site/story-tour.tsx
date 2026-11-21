"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Copy, FileText, Globe, LoaderCircle, Lock, Mail, Minus, Plus, ShieldCheck, Wallet } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { BrandMark, DEMO_BRANDS, DEMO_DEALS, DealArt, chf, discount, type DemoBrand, type DemoDeal } from "./demo-brands";
import { Scaled, useInView, useReducedMotion, useTicker } from "./demo-kit";
import "./tour.css";

type Labels = Dictionary["site"]["tour"];
type Locale = "de" | "en";

/**
 * Product tour under the bands (ported from the reference landing): a navigation that follows the scroll (left and
 * sticky on desktop, a sticky row of pills on phones) and four chapters, each a large mockup plus two
 * small cards. The mockups are not videos: they are Sellycat's dashboard and the fictional shops drawn
 * in code and animated in a loop, so they stay sharp, light and translated. Everything runs only while
 * its chapter is on screen; `prefers-reduced-motion` shows a meaningful still frame.
 */
export function StoryTour({ labels, locale }: { labels: Labels; locale: Locale }) {
  const [active, setActive] = useState(0);
  const chapters = useRef<(HTMLElement | null)[]>([]);
  const pills = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  // The active chapter is the last one whose top has passed 40 % of the viewport, computed once per
  // frame from the scroll position (intersection observers at a boundary made the pills flicker).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let next = 0;
      chapters.current.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) next = i; });
      setActive((a) => (a === next ? a : next));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  // Phones: keep the active pill in view inside its own row (never scroll the page sideways).
  useEffect(() => {
    const row = pills.current;
    const pill = row?.children[active] as HTMLElement | undefined;
    if (!row || !pill) return;
    row.scrollTo({ left: pill.offsetLeft - (row.clientWidth - pill.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  const go = (i: number) => chapters.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

  return (
    <div className="mx-auto mt-[calc(var(--site-gap)*1.5)] max-w-6xl px-5 sm:px-8" data-testid="story-tour">
      <div className="site-head">
        <h2>{labels.title}</h2>
        <p>{labels.subtitle}</p>
      </div>
      {/* Phones and tablets: the chapters as a sticky row of pills (solid ground on its own layer: a blurred sticky bar jitters on iOS). */}
      <nav className="sticky top-0 z-20 -mx-5 mb-6 bg-site-ground py-3 [transform:translateZ(0)] sm:-mx-8 lg:hidden" aria-label={labels.nav}>
        <ol ref={pills} className="tour-pills flex gap-2 overflow-x-auto px-5 sm:px-8">
          {labels.chapters.map((c, i) => (
            <li key={i} className="shrink-0">
              <button type="button" onClick={() => go(i)} aria-current={active === i ? "step" : undefined} className={`h-9 rounded-full px-4 text-sm font-medium transition ${active === i ? "bg-fg text-site-ground" : "bg-fg/[0.06] text-fg/60 hover:text-fg"}`} data-testid="tour-pill">{c.label}</button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="lg:grid lg:grid-cols-[12rem_1fr] lg:gap-14">
        {/* Desktop: the rail on the left, the active chapter in white with a coral marker. */}
        <nav className="hidden lg:block" aria-label={labels.nav}>
          <ol className="sticky top-28 flex flex-col gap-1 border-l border-fg/10">
            {labels.chapters.map((c, i) => (
              <li key={i}>
                <button type="button" onClick={() => go(i)} aria-current={active === i ? "step" : undefined} className={`relative -ml-px block w-full border-l-2 py-2 pl-5 text-left text-[17px] font-medium tracking-tight transition-colors ${active === i ? "border-coral text-fg" : "border-transparent text-fg/40 hover:text-fg/70"}`} data-testid="tour-nav">{c.label}</button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-col gap-10 lg:gap-16">
          {labels.chapters.slice(0, MOCKS.length).map((c, i) => (
            <ChapterBlock key={i} index={i} chapter={c} labels={labels} locale={locale} reduced={reduced} refFn={(el) => { chapters.current[i] = el; }} />
          ))}
        </div>
      </div>
    </div>
  );
}

type MockProps = { narrow: boolean; running: boolean; still: boolean; l: Labels; locale: Locale };
type CardProps = { running: boolean; still: boolean; l: Labels; locale: Locale };

const MOCKS = [BrandsMock, DomainMock, ControlMock, FormatsMock];
const CARDS = [[BrandKitCard, LivePreviewCard], [CertCard, SenderCard], [WindowCard, TermsCard], [PoolCard, PdfWalletCard]];

function ChapterBlock({ index, chapter, labels, locale, reduced, refFn }: { index: number; chapter: Labels["chapters"][number]; labels: Labels; locale: Locale; reduced: boolean; refFn: (el: HTMLElement | null) => void }) {
  const [inView, setRef] = useInView();
  const running = inView && !reduced;
  const Mock = MOCKS[index];
  return (
    <article ref={(el) => { refFn(el); setRef(el); }} data-index={index} className="demo-root scroll-mt-20 lg:scroll-mt-28" data-testid="tour-chapter" data-running={running ? "1" : "0"}>
      <div className="tour-box overflow-hidden rounded-[2rem] border border-fg/[0.08]">
        <div className="tour-stage relative px-5 pb-8 pt-7 sm:px-10 sm:pb-12 sm:pt-10">
          <h3 className="max-w-2xl text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {chapter.title} <span className="text-fg/55">{chapter.text}</span>
          </h3>
          <div className="mt-8 sm:mt-10">
            <Scaled wide={[780, 460]} narrow={[360, 740]}>{(narrow) => <Mock narrow={narrow} running={running} still={reduced} l={labels} locale={locale} />}</Scaled>
          </div>
        </div>
        <div className="grid border-t border-fg/[0.08] sm:grid-cols-2">
          {chapter.cards.slice(0, 2).map((c, i) => {
            const Card = CARDS[index][i];
            return (
              <div key={i} className={`flex flex-col px-6 py-7 sm:px-8 sm:py-9 ${i ? "border-t border-fg/[0.08] sm:border-l sm:border-t-0" : ""}`} data-testid="tour-card">
                <h4 className="text-lg font-semibold tracking-tight">{c.title}</h4>
                <p className="mt-1 text-[15px] leading-relaxed text-fg/60">{c.text}</p>
                <div className="mt-8 flex flex-1 items-end">
                  <Scaled wide={[340, 210]}>{() => <Card running={running} still={reduced} l={labels} locale={locale} />}</Scaled>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

/* ---------- Shared pieces ---------- */

/** Fixed light colours of the success state inside the (always light) mockups. */
const OK = "#1a7f37";
const fill = (text: string, n: number | string) => text.replace("{n}", String(n));
const title = (d: DemoDeal, locale: Locale) => d.title[locale];
/** Colour/radius changes of the fictional shops fade instead of jumping. */
const BRAND_T: CSSProperties = { transition: "background-color 0.7s ease, color 0.7s ease, border-radius 0.7s ease, box-shadow 0.7s ease" };

/** A Sellycat dashboard window in the light product look (mist ground, white cards, ink text, coral accent). */
function Window({ tab, l, action, children }: { tab: string; l: Labels; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[var(--mist)] text-[var(--ink-brand)] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white px-4 text-[13px]">
        <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-black/10" />)}</span>
        <span className="truncate font-medium"><span className="text-[var(--gray)]">{l.ui.dashboard} /</span> {tab}</span>
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </div>
  );
}

function Head({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--gray)]">{children}</p>;
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <span className={`flex items-center justify-between gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] ${className}`}>
      <span className="text-[var(--gray)]">{label}</span><span className="flex items-center gap-1.5 font-medium tabular-nums">{children}</span>
    </span>
  );
}

function Toggle({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px]">
      <span>{label}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-coral" : "bg-black/15"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-300 ${on ? "translate-x-3.5" : "translate-x-0.5"}`} /></span>
    </span>
  );
}

function LiveChip({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a7f37]/10 px-2.5 py-1 text-[11px] font-medium text-[#1a7f37]"><span className="tour-live h-1.5 w-1.5 rounded-full bg-[#1a7f37]" />{label}</span>;
}

/** A browser window around a shop: address bar with the host and (once secured) a padlock. */
function Browser({ host, secure, children }: { host: string; secure: boolean; children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_-25px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.08]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-black/[0.06] bg-[#fafafa] px-3">
        <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-black/10" />)}</span>
        <span className="mx-auto flex h-6 min-w-0 max-w-[80%] flex-1 items-center justify-center gap-1.5 rounded-md bg-black/[0.05] px-3 text-[11px] text-[#444]">
          <Lock className={`h-3 w-3 shrink-0 transition-all duration-500 ${secure ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} style={{ color: OK }} />
          <span className="truncate">{host}</span>
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

const SHOP_DEALS = [DEMO_DEALS[0], DEMO_DEALS[2], DEMO_DEALS[3], DEMO_DEALS[1]];

/**
 * The deal shop of a fictional customer: header with logo, a hero deal and three deal cards. With several
 * brands the logos crossfade and colours, corners and fonts follow the active brand.
 */
function ShopBody({ brands, active, l, locale, narrow }: { brands: DemoBrand[]; active: number; l: Labels; locale: Locale; narrow: boolean }) {
  const b = brands[active];
  const r = b.radius;
  const [hero, ...grid] = SHOP_DEALS;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ ...BRAND_T, background: b.surface, color: b.ink, fontFamily: b.font }}>
      <div className="flex h-12 items-center gap-3 border-b px-4" style={{ ...BRAND_T, borderColor: `${b.ink}14`, background: "#fff" }}>
        <span className="relative h-6 flex-1">
          {brands.map((x, i) => (
            <span key={x.id} className={`absolute inset-y-0 left-0 flex items-center whitespace-nowrap transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}><BrandMark brand={x} size={20} /></span>
          ))}
        </span>
        {narrow ? null : l.ui.categories.map((c) => <span key={c} className="text-[11px] opacity-60">{c}</span>)}
        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ ...BRAND_T, background: b.primary, color: b.onPrimary, borderRadius: r }}>{l.ui.deals}</span>
      </div>
      <div className="p-3">
        <div className="flex overflow-hidden bg-white shadow-[0_6px_20px_-12px_rgba(0,0,0,0.35)]" style={{ ...BRAND_T, borderRadius: r }}>
          <div className={`relative shrink-0 ${narrow ? "h-[120px] w-[124px]" : "h-[116px] w-[180px]"}`}>
            <DealArt deal={hero} />
            <span className="absolute left-2 top-2 px-2 py-0.5 text-[10px] font-bold" style={{ ...BRAND_T, background: b.primary, color: b.onPrimary, borderRadius: r / 2 }}>−{discount(hero)} %</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-3">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em]" style={{ ...BRAND_T, color: b.primary }}>{l.brands.hero}</span>
            <span key={b.id} className="stour-fade mt-1 text-[16px] font-bold leading-tight">{title(hero, locale)}</span>
            <span className="mt-0.5 text-[11px] opacity-60">{hero.partner}</span>
            <span className="mt-auto flex items-center gap-2 whitespace-nowrap">
              <span className="text-[14px] font-bold tabular-nums">{chf(hero.priceCents)}</span>
              {narrow ? null : <span className="text-[11px] tabular-nums line-through opacity-45">{chf(hero.valueCents)}</span>}
              <span className="ml-auto px-3 py-1.5 text-[11px] font-semibold" style={{ ...BRAND_T, background: b.primary, color: b.onPrimary, borderRadius: Math.min(r, 14) }}>{l.ui.buy}</span>
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {grid.map((d) => (
            <div key={d.id} className="overflow-hidden bg-white shadow-[0_6px_20px_-14px_rgba(0,0,0,0.35)]" style={{ ...BRAND_T, borderRadius: r * 0.8 }}>
              <div className={narrow ? "h-[60px]" : "h-[52px]"}><DealArt deal={d} /></div>
              <div className="px-2 pb-2 pt-1.5">
                <p key={b.id} className="stour-fade truncate text-[10.5px] font-semibold">{title(d, locale)}</p>
                <p className="mt-0.5 flex items-center justify-between whitespace-nowrap text-[10px] tabular-nums"><span className="font-bold">{chf(d.priceCents)}</span>{narrow ? null : <span style={{ ...BRAND_T, color: b.primary }} className="font-semibold">−{discount(d)} %</span>}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Chapter 1: one shop, many brands ---------- */

const FONT_NAMES: Record<string, string> = { radio: "Inter", city: "Georgia", club: "SF Rounded" };

function BrandsMock({ narrow, running, l, locale }: MockProps) {
  const t = l.brands;
  const active = useTicker(running, 2500) % DEMO_BRANDS.length;
  const b = DEMO_BRANDS[active];
  const panel = (
    <div className={`flex min-w-0 flex-col gap-2.5 p-4 ${narrow ? "" : "w-[250px] shrink-0 border-r border-black/[0.06] bg-white/60"}`}>
      <Head>{t.tab}</Head>
      <div className={narrow ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
        <Field label={t.logo}>
          <span className="relative h-5 w-5">
            {DEMO_BRANDS.map((x, i) => <span key={x.id} className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}><BrandIcon brand={x} /></span>)}
          </span>
        </Field>
        <Field label={t.font}><span key={b.id} className="stour-fade" style={{ fontFamily: b.font }}>{FONT_NAMES[b.id]}</span></Field>
        <Field label={t.primary}><span className="h-4 w-4 rounded" style={{ ...BRAND_T, background: b.primary }} /><span key={b.id} className="stour-fade font-mono text-[11px]">{b.primary}</span></Field>
        <Field label={t.surface}><span className="h-4 w-4 rounded ring-1 ring-black/10" style={{ ...BRAND_T, background: b.surface }} /><span key={b.id} className="stour-fade font-mono text-[11px]">{b.surface}</span></Field>
      </div>
      <div className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px]">
        <span className="flex justify-between"><span className="text-[var(--gray)]">{t.corners}</span><span className="font-medium tabular-nums">{b.radius} px</span></span>
        <span className="relative mt-2 block h-1 rounded-full bg-black/10">
          <span className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-coral transition-transform duration-700" style={{ transform: `scaleX(${b.radius / 32})` }} />
          <span className="absolute -top-1 left-0 h-3 w-full transition-transform duration-700" style={{ transform: `translateX(${(b.radius / 32) * 100}%)` }}><span className="block h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow ring-1 ring-black/15" /></span>
        </span>
      </div>
      <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: OK }}><Check className="h-3.5 w-3.5" />{t.contrast}</span>
    </div>
  );
  const preview = (
    <div className={`flex min-w-0 flex-1 flex-col p-4 ${narrow ? "h-[430px] shrink-0 pb-0" : ""}`}>
      <div className="mb-2 flex items-center justify-between"><Head>{t.preview}</Head><LiveChip label={l.ui.live} /></div>
      <div className="min-h-0 flex-1">
        <Browser host={b.domain} secure><ShopBody brands={DEMO_BRANDS} active={active} l={l} locale={locale} narrow={narrow} /></Browser>
      </div>
    </div>
  );
  return (
    <Window tab={t.tab} l={l}>
      <div className={`flex min-h-0 flex-1 ${narrow ? "flex-col" : ""}`}>
        {narrow ? <>{preview}{panel}</> : <>{panel}{preview}</>}
      </div>
    </Window>
  );
}

/** Only the square mark of a brand logo (without the name). */
function BrandIcon({ brand }: { brand: DemoBrand }) {
  return (
    <span className="block h-5 w-5 overflow-hidden" style={{ width: 20 }}>
      <BrandMark brand={{ ...brand, name: "" }} size={20} />
    </span>
  );
}

/* ---------- Chapter 2: your domain ---------- */

const DOMAIN_STEPS = 11;

function DomainMock({ narrow, running, still, l, locale }: MockProps) {
  const t = l.domain;
  const tick = useTicker(running, 1100);
  // 0 empty · 1 typing · 2 add · 3–4 checking DNS · 5 connected · 6 SSL · 7–10 the shop at the domain.
  const step = still ? 8 : tick % DOMAIN_STEPS;
  const typed = step >= 1;
  const checking = step === 3 || step === 4;
  const status = step < 3 ? -1 : checking ? 0 : step === 5 ? 1 : 2;
  const brand: DemoBrand = { ...DEMO_BRANDS[0], name: t.company, domain: t.host };
  const chip = status < 0 ? null : (
    <span key={status} className={`tour-pop inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${checking ? "bg-[#b25e00]/10 text-[#b25e00]" : "bg-[#1a7f37]/10 text-[#1a7f37]"}`}>
      {checking ? <LoaderCircle className="stour-spin h-3.5 w-3.5" /> : status === 1 ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {[t.checking, t.connected, t.ssl][status]}
    </span>
  );
  const steps = [t.checking, t.connected, t.ssl];
  const panel = (
    <div className={`flex min-w-0 flex-col p-5 ${narrow ? "" : "w-[390px] shrink-0 border-r border-black/[0.06] bg-white/60"}`}>
      <div className="mb-1 flex items-center justify-between"><Head>{t.label}</Head>{chip}</div>
      <div className="flex gap-2">
        <span className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-black/[0.12] bg-white px-3 font-mono text-[12.5px]">
          {typed ? <span key={step === 1 ? "typing" : "set"} className={step === 1 ? "tour-type inline-block whitespace-nowrap" : "whitespace-nowrap"}>{t.host}</span> : null}
          {step <= 1 ? <span className="tour-caret ml-0.5 inline-block h-4 w-px bg-coral" /> : null}
        </span>
        <span className={`inline-flex h-9 items-center rounded-lg px-3.5 text-[12px] font-semibold transition-colors ${step >= 2 ? "bg-coral text-on-coral" : "bg-black/10 text-black/40"} ${step === 2 ? "tour-press" : ""}`}><Plus className="mr-1 h-3.5 w-3.5" />{t.add}</span>
      </div>
      <div className={`mt-4 transition-all duration-500 ${step >= 3 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        <Head>{t.record}</Head>
        <div className="overflow-hidden rounded-lg border border-black/[0.08] bg-white text-[11.5px]">
          <div className="grid grid-cols-[64px_64px_1fr] gap-2 border-b border-black/[0.06] px-3 py-1.5 text-[10.5px] text-[var(--gray)]"><span>{t.type}</span><span>{t.name}</span><span>{t.value}</span></div>
          <div className="grid grid-cols-[64px_64px_1fr] items-center gap-2 px-3 py-2 font-mono">
            <span className="font-semibold">CNAME</span><span>deals</span>
            <span className="flex items-center justify-between gap-2"><span className="truncate">cname.sellycat.com</span><Copy className="h-3.5 w-3.5 shrink-0 text-[var(--gray)]" /></span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {steps.map((s, i) => {
          const done = status > i || (status === 2 && i === 2);
          const busy = status === i && i === 0 && checking;
          return (
            <span key={s} className={`flex items-center gap-2.5 text-[12px] transition-opacity duration-500 ${status >= i ? "opacity-100" : "opacity-35"}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-500 ${done ? "bg-[#1a7f37] text-white" : "bg-black/[0.07] text-[var(--gray)]"}`}>
                {busy ? <LoaderCircle className="stour-spin h-3.5 w-3.5" /> : done ? (i === 2 ? <Lock className="h-3 w-3" /> : <Check className="h-3 w-3" />) : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className={done ? "font-medium" : ""}>{s}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
  const preview = (
    <div className={`tour-dots min-w-0 flex-1 p-4 ${narrow ? "h-[360px] shrink-0 border-b border-black/[0.06]" : ""}`} style={{ backgroundColor: "#ececec" }}>
      <Browser host={typed ? t.host : ""} secure={step >= 6}>
        {step >= 7 ? (
          <div className="tour-pop absolute inset-0"><ShopBody brands={[brand]} active={0} l={l} locale={locale} narrow /></div>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[#fafafa] text-[12px] text-[var(--gray)]">
            <span className="flex flex-col items-center gap-2">
              {checking ? <LoaderCircle className="stour-spin h-6 w-6" /> : <Globe className="h-6 w-6 opacity-50" />}
              {typed ? t.waiting : null}
            </span>
          </div>
        )}
      </Browser>
    </div>
  );
  return (
    <Window tab={t.tab} l={l}>
      <div className={`flex min-h-0 flex-1 ${narrow ? "flex-col" : ""}`}>
        {narrow ? <>{preview}{panel}</> : <>{panel}{preview}</>}
      </div>
    </Window>
  );
}

/* ---------- Chapter 3: full control ---------- */

const STOCK = 12;
const CONTROL_STEPS = 18;
/** Countdown start: 2 days 14:22:05, counted down by the ticker (no clock in the render). */
const COUNTDOWN_START = 2 * 86400 + 14 * 3600 + 22 * 60 + 5;

function countdownParts(elapsed: number) {
  const left = Math.max(0, COUNTDOWN_START - elapsed);
  return [Math.floor(left / 86400), Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0"));
}

function ControlMock({ narrow, running, still, l, locale }: MockProps) {
  const t = l.control;
  const tick = useTicker(running, 700);
  const seconds = useTicker(running, 1000);
  // One sale per step until nothing is left, then the deal shows «Sold out» for a while and starts again.
  const step = still ? 9 : tick % CONTROL_STEPS;
  const sold = Math.min(STOCK, step);
  const left = STOCK - sold;
  const soldOut = left === 0;
  const b = DEMO_BRANDS[1];
  const deal = DEMO_DEALS[2];
  const parts = countdownParts(seconds);
  const editor = (
    <div className={`flex min-w-0 flex-col gap-2.5 p-5 ${narrow ? "" : "w-[400px] shrink-0 border-r border-black/[0.06] bg-white/60"}`}>
      <Head>{title(deal, locale)}</Head>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label={t.stock}>{STOCK}</Field>
        <div className="relative rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px]">
          <span className="flex justify-between"><span className="text-[var(--gray)]">{t.sold}</span><span className="font-medium tabular-nums">{sold} / {STOCK}</span></span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-black/10"><span className="block h-full w-full origin-left rounded-full bg-coral transition-transform duration-500" style={{ transform: `scaleX(${sold / STOCK})` }} /></span>
          {running && step > 0 && !soldOut ? <span key={step} className="stour-rise absolute -top-3 right-2 rounded-full bg-coral px-2 py-0.5 text-[10px] font-semibold text-on-coral">{t.newOrder}</span> : null}
        </div>
      </div>
      <Field label={t.window}>{t.windowValue}</Field>
      <span className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px]">
        <span className="text-[var(--gray)]">{t.perOrder}</span>
        <span className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-black/[0.06]"><Minus className="h-3 w-3" /></span>
          <span className="w-4 text-center font-medium tabular-nums">4</span>
          <span className="grid h-6 w-6 place-items-center rounded-md bg-black/[0.06]"><Plus className="h-3 w-3" /></span>
        </span>
      </span>
      <Toggle label={t.countdown} on />
      <Toggle label={fill(t.remaining, "X")} on />
    </div>
  );
  const urgent = left <= 3;
  const preview = (
    <div className={`tour-dots flex min-w-0 flex-1 items-center justify-center p-5 ${narrow ? "h-[360px] shrink-0 border-b border-black/[0.06]" : ""}`} style={{ backgroundColor: b.surface }}>
      <div className="w-[300px] overflow-hidden bg-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]" style={{ borderRadius: b.radius + 6, fontFamily: b.font, color: b.ink }}>
        <div className={`relative ${narrow ? "h-[106px]" : "h-[130px]"}`}>
          <DealArt deal={deal} />
          <span className={`absolute inset-0 bg-black/45 transition-opacity duration-500 ${soldOut ? "opacity-100" : "opacity-0"}`} />
          {soldOut ? <span className="stour-flip absolute left-1/2 top-1/2 -ml-[70px] -mt-[17px] w-[140px] -rotate-8 rounded-md bg-white py-2 text-center text-[14px] font-black uppercase tracking-[0.08em]" style={{ color: b.primary }}>{t.soldOut}</span> : null}
        </div>
        <div className="p-3.5">
          <p className="text-[15px] font-bold leading-tight">{title(deal, locale)}</p>
          <p className="mt-0.5 text-[11px] opacity-60">{deal.partner}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[15px] font-bold tabular-nums">{chf(deal.priceCents)}</span>
            <span className="text-[11px] tabular-nums line-through opacity-45">{chf(deal.valueCents)}</span>
            <span key={left} className={`tour-pop ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${soldOut ? "bg-black/[0.06] text-black/50" : urgent ? "bg-[#b42318]/10 text-[#b42318]" : ""}`} style={!soldOut && !urgent ? { background: `${b.primary}18`, color: b.primary } : undefined}>
              {soldOut ? t.soldOut : fill(l.ui.left, left)}
            </span>
          </div>
          <div className={`mt-3 transition-opacity duration-500 ${soldOut ? "opacity-40" : ""}`}>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] opacity-60">{t.endsIn}</p>
            <div className="mt-1 flex gap-1.5">
              {parts.map((p, i) => (
                <span key={i} className="flex flex-1 items-baseline justify-center gap-0.5 rounded-md py-1 tabular-nums" style={{ background: b.surface }}>
                  <span className="text-[14px] font-bold">{p}</span><span className="text-[9px] opacity-60">{t.units[i]}</span>
                </span>
              ))}
            </div>
          </div>
          <span className={`mt-3 flex h-9 items-center justify-center text-[12.5px] font-semibold transition-colors duration-500 ${soldOut ? "bg-black/[0.08] text-black/45" : ""}`} style={{ borderRadius: b.radius, ...(soldOut ? {} : { background: b.primary, color: b.onPrimary }) }}>
            {soldOut ? t.soldOut : l.ui.buy}
          </span>
        </div>
      </div>
    </div>
  );
  return (
    <Window tab={t.tab} l={l} action={<LiveChip label={l.ui.live} />}>
      <div className={`flex min-h-0 flex-1 ${narrow ? "flex-col" : ""}`}>
        {narrow ? <>{preview}{editor}</> : <>{editor}{preview}</>}
      </div>
    </Window>
  );
}

/* ---------- Chapter 4: voucher formats ---------- */

const VOUCHER_CODE = "KATER-7Q2M";
/**
 * Real symbols of the example code, generated once with bwip-js (the library behind `symbolVector`) and
 * stored compactly so the client needs no barcode library: QR rows as base-36 bit masks (21 × 21 modules),
 * Code 128 as alternating bar/space widths in modules.
 */
const QR_ROWS = ["18n7j", "mxc1", "wt3x", "wrbx", "wrx9", "myip", "18prz", "lc", "6z0e", "sxc5", "177eg", "nxhk", "li2m", "5mn", "18p8z", "my6a", "wo2p", "wolw", "wsq3", "mvm9", "18omn"];
const QR_SIZE = 21;
const CODE128_SBS = "2112141123311113232133111321132311311221323121312113312232111131232131312331112";

/** One path of horizontal runs of dark modules (exact squares, no anti-aliasing seams between neighbours). */
const QR_PATH = QR_ROWS.map((row, y) => {
  const bits = parseInt(row, 36).toString(2).padStart(QR_SIZE, "0");
  let d = "";
  for (let x = 0, start = -1; x <= QR_SIZE; x++) {
    const dark = x < QR_SIZE && bits[x] === "1";
    if (dark && start < 0) start = x;
    if (!dark && start >= 0) { d += `M${start} ${y}h${x - start}v1h-${x - start}z`; start = -1; }
  }
  return d;
}).join("");

const BARS = (() => {
  let x = 0;
  let d = "";
  [...CODE128_SBS].forEach((c, i) => {
    const w = Number(c);
    if (i % 2 === 0) d += `M${x} 0h${w}v1h-${w}z`;
    x += w;
  });
  return { d, width: x };
})();

function QrSymbol({ size, color = "#111" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`} shapeRendering="crispEdges" aria-hidden>
      <rect x="-1" y="-1" width={QR_SIZE + 2} height={QR_SIZE + 2} fill="#fff" />
      <path d={QR_PATH} fill={color} />
    </svg>
  );
}

function BarSymbol({ width, height, color = "#111" }: { width: number; height: number; color?: string }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${BARS.width} 1`} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden>
      <path d={BARS.d} fill={color} />
    </svg>
  );
}

/** The voucher's code area: number code, QR code and barcode stacked, the active one crossfades and scales in. */
function CodeMorph({ format, brand, label }: { format: number; brand: DemoBrand; label: string }) {
  const layer = (i: number) => `absolute inset-0 flex flex-col items-center justify-center transition-[opacity,transform] duration-700 ease-out ${format === i ? "scale-100 opacity-100" : format > i || (format === 0 && i === 2) ? "scale-90 opacity-0" : "scale-110 opacity-0"}`;
  return (
    <div className="relative h-[150px]">
      <div className={layer(0)}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-55">{label}</span>
        <span className="mt-2 rounded-lg px-4 py-2.5 font-mono text-[22px] font-bold tracking-[0.12em]" style={{ background: brand.surface }}>{VOUCHER_CODE}</span>
      </div>
      <div className={layer(1)}><QrSymbol size={124} /></div>
      <div className={layer(2)}>
        <BarSymbol width={236} height={78} />
        <span className="mt-1.5 font-mono text-[11px] tracking-[0.2em] opacity-70">{VOUCHER_CODE}</span>
      </div>
    </div>
  );
}

function FormatsMock({ narrow, running, still, l, locale }: MockProps) {
  const t = l.formats;
  const tick = useTicker(running, 2400) % 3;
  const format = still ? 1 : tick;
  const b = DEMO_BRANDS[0];
  const deal = DEMO_DEALS[0];
  const panel = (
    <div className={`flex min-w-0 flex-col gap-3 p-5 ${narrow ? "" : "w-[360px] shrink-0 border-r border-black/[0.06] bg-white/60"}`}>
      <div>
        <Head>{t.format}</Head>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/[0.06] p-1 text-center text-[11.5px]">
          {t.options.map((o, i) => <span key={o} className={`rounded-lg py-2 font-medium transition-colors duration-300 ${i === format ? "bg-coral text-on-coral shadow-sm" : "text-[var(--gray)]"} ${i === format && !still ? "tour-press" : ""}`}>{o}</span>)}
        </div>
      </div>
      <Field label={t.symbology} className={`transition-opacity duration-500 ${format === 2 ? "opacity-100" : "opacity-45"}`}>Code 128</Field>
      <div>
        <Head>{t.source}</Head>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/[0.06] p-1 text-center text-[11.5px]">
          {t.sources.map((o, i) => <span key={o} className={`rounded-lg py-2 font-medium ${i === 0 ? "bg-white shadow-sm" : "text-[var(--gray)]"}`}>{o}</span>)}
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium ring-1 ring-black/[0.08]"><FileText className="h-3.5 w-3.5 text-coral-text" />{t.pdf}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium ring-1 ring-black/[0.08]"><Wallet className="h-3.5 w-3.5 text-coral-text" />{t.wallet}</span>
      </div>
    </div>
  );
  const voucher = (
    <div className={`tour-dots flex min-w-0 flex-1 items-center justify-center p-5 ${narrow ? "h-[420px] shrink-0 border-b border-black/[0.06]" : ""}`} style={{ backgroundColor: "#ececec" }}>
      <div className="w-[290px] overflow-hidden bg-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]" style={{ borderRadius: b.radius, fontFamily: b.font, color: b.ink }}>
        <div className="relative h-[92px]">
          <DealArt deal={deal} />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1"><BrandMark brand={b} size={14} /></span>
        </div>
        <div className="px-4 pb-3 pt-3">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: b.primary }}>{t.voucher}</p>
          <p className="mt-0.5 text-[15px] font-bold leading-tight">{title(deal, locale)}</p>
          <p className="mt-0.5 flex justify-between text-[11px] opacity-60"><span>{deal.partner}</span><span>{t.validUntil}</span></p>
        </div>
        <div className="relative mx-4 border-t border-dashed border-black/15">
          <span className="absolute -left-[26px] -top-2.5 h-5 w-5 rounded-full bg-[#ececec]" />
          <span className="absolute -right-[26px] -top-2.5 h-5 w-5 rounded-full bg-[#ececec]" />
        </div>
        <div className="px-4 pb-4 pt-2"><CodeMorph format={format} brand={b} label={t.code} /></div>
      </div>
    </div>
  );
  return (
    <Window tab={t.tab} l={l}>
      <div className={`flex min-h-0 flex-1 ${narrow ? "flex-col" : ""}`}>
        {narrow ? <>{voucher}{panel}</> : <>{panel}{voucher}</>}
      </div>
    </Window>
  );
}

/* ---------- Cards (small loops, 340 × 210) ---------- */

const CARD = "h-full overflow-hidden rounded-2xl border border-fg/10 bg-white p-4 text-fg shadow-[0_1px_2px_rgb(17_17_17/0.04)]";

/** Three brand kits (logo, colours, font sample); the active one is highlighted in turn. */
function BrandKitCard({ running }: CardProps) {
  const active = useTicker(running, 2500) % DEMO_BRANDS.length;
  return (
    <div className={`${CARD} flex flex-col justify-center gap-2`}>
      {DEMO_BRANDS.map((b, i) => (
        <div key={b.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-[background-color,box-shadow] duration-500 ${i === active ? "bg-fg/[0.08] ring-1 ring-coral" : "bg-fg/[0.03]"}`}>
          <span className="flex min-w-0 flex-1 items-center rounded-lg bg-white px-2 py-1"><BrandMark brand={b} size={16} /></span>
          <span className="h-5 w-5 rounded-md ring-1 ring-fg/20" style={{ background: b.primary }} />
          <span className="h-5 w-5 rounded-md ring-1 ring-fg/20" style={{ background: b.surface }} />
          <span className="w-8 text-center text-[17px] font-bold" style={{ fontFamily: b.font }}>Aa</span>
        </div>
      ))}
    </div>
  );
}

const PICKS = [
  { bg: "#6D3BFF", on: "#FFFFFF" },
  { bg: "#0E7C66", on: "#FFFFFF" },
  { bg: "#F2B705", on: "#111111" },
  { bg: "#E2366B", on: "#FFFFFF" },
  { bg: "#1F6F8B", on: "#FFFFFF" },
  { bg: "#111111", on: "#FFFFFF" },
];

/** A colour picked in the dashboard shows up in the shop preview at once. */
function LivePreviewCard({ running, l, locale }: CardProps) {
  const pick = useTicker(running, 1600) % PICKS.length;
  const p = PICKS[pick];
  const deal = DEMO_DEALS[3];
  return (
    <div className={`${CARD} flex gap-3`}>
      <div className="flex w-[104px] shrink-0 flex-col gap-2 rounded-xl bg-fg/[0.04] p-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg/50">{l.brands.primary}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {PICKS.map((c, i) => <span key={c.bg} className={`h-6 rounded-md transition-shadow duration-300 ${i === pick ? "ring-2 ring-coral ring-offset-2 ring-offset-site-surface" : "ring-1 ring-fg/15"}`} style={{ background: c.bg }} />)}
        </div>
        <span className="mt-auto font-mono text-[11px] text-fg/70">{p.bg}</span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl bg-white text-[#111]">
        <span className="absolute right-2 top-2 z-10"><LiveChip label={l.ui.live} /></span>
        <div className="h-[86px]"><DealArt deal={deal} /></div>
        <div className="p-2.5">
          <p className="truncate text-[12px] font-bold">{title(deal, locale)}</p>
          <p className="mt-0.5 text-[11px] tabular-nums">{chf(deal.priceCents)}</p>
          <span className="mt-2 flex h-8 items-center justify-center rounded-lg text-[12px] font-semibold" style={{ ...BRAND_T, background: p.bg, color: p.on }}>{l.ui.buy}</span>
        </div>
      </div>
    </div>
  );
}

/** The certificate of the shop's domain: host, then «valid» and «automatic renewal» check in. */
function CertCard({ running, still, l }: CardProps) {
  const t = l.domain;
  const tick = useTickerMod(running, 1100, 6);
  const step = still ? 4 : tick;
  const rows = [
    { k: t.certificate, v: t.valid },
    { k: t.renewal, v: t.automatic },
  ];
  return (
    <div className={`${CARD} flex flex-col justify-center`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-500 ${step >= 1 ? "bg-coral text-on-coral" : "bg-fg/10 text-fg/50"}`}><ShieldCheck className="h-5 w-5" /></span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-mono text-[13px]"><Lock className="h-3.5 w-3.5 text-coral-text" />{t.host}</span>
          <span className="text-[11px] text-fg/50">HTTPS · TLS</span>
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r, i) => (
          <span key={r.k} className={`flex items-center justify-between rounded-xl bg-fg/[0.05] px-3 py-2.5 text-[12px] transition-opacity duration-500 ${step >= i + 2 ? "opacity-100" : "opacity-30"}`}>
            <span className="text-fg/60">{r.k}</span>
            <span className="flex items-center gap-1.5 font-medium"><Check className="h-3.5 w-3.5 text-coral-text" />{r.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** A voucher mail from the customer's own address; SPF and DKIM check in, then the sender is active. */
function SenderCard({ running, still, l }: CardProps) {
  const t = l.domain;
  const tick = useTickerMod(running, 1100, 6);
  const step = still ? 4 : tick;
  return (
    <div className={`${CARD} flex flex-col justify-center`}>
      <div className="rounded-xl bg-white p-3 text-[12px] text-[#111]">
        <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-[#666]" /><span className="text-[#666]">{t.from}</span><span className="truncate font-semibold">{t.company}</span></p>
        <p className="mt-1 truncate pl-6 font-mono text-[11px] text-[#444]">{t.mail}</p>
        <p className="mt-2 truncate border-t border-black/[0.08] pt-2 font-medium">{t.subject}</p>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        {["SPF", "DKIM"].map((k, i) => (
          <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors duration-500 ${step >= i + 1 ? "bg-coral/15 text-coral-text" : "bg-fg/[0.06] text-fg/40"}`}>
            {step >= i + 1 ? <Check className="h-3 w-3" /> : null}{k}
          </span>
        ))}
        <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full bg-coral px-2.5 py-1 font-semibold text-on-coral transition-[opacity,transform] duration-500 ${step >= 3 ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>{t.verified}</span>
      </div>
    </div>
  );
}

/** Sales window as a timeline with a «now» marker walking through it, and the stock as twelve tiles. */
function WindowCard({ running, still, l }: CardProps) {
  const t = l.control;
  const tick = useTickerMod(running, 800, 15);
  const step = still ? 7 : tick;
  const sold = Math.min(STOCK, step);
  const track = 276;
  return (
    <div className={`${CARD} flex flex-col justify-center`}>
      <div className="flex justify-between text-[11px] text-fg/50"><span>{t.from} · 1.12.</span><span>{t.to} · 24.12.</span></div>
      <div className="relative mt-2 h-2 rounded-full bg-fg/10" style={{ width: track }}>
        <span className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-coral/40 transition-transform duration-700" style={{ transform: `scaleX(${step / 14})` }} />
        <span className="absolute -top-1.5 left-0 transition-transform duration-700" style={{ transform: `translateX(${(step / 14) * track}px)` }}>
          <span className="block h-5 w-1 -translate-x-1/2 rounded-full bg-coral" />
          <span className="absolute left-0 top-6 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-coral-text">{t.now}</span>
        </span>
      </div>
      <div className="mt-9 grid grid-cols-12 gap-1.5">
        {Array.from({ length: STOCK }, (_, i) => <span key={i} className={`h-6 rounded-md transition-opacity duration-500 ${i < sold ? "bg-fg/10 opacity-60" : "bg-coral"}`} />)}
      </div>
      <p className="mt-2.5 text-[12px] font-medium">{sold >= STOCK ? t.soldOut : fill(l.ui.left, STOCK - sold)}</p>
    </div>
  );
}

/** The deal's terms and redemption window check in one by one. */
function TermsCard({ running, still, l }: CardProps) {
  const t = l.control;
  const tick = useTickerMod(running, 1100, t.terms.length + 2);
  const step = still ? t.terms.length : tick;
  return (
    <div className={`${CARD} flex flex-col justify-center`}>
      <Head2>{t.termsHead}</Head2>
      <div className="flex flex-col gap-1.5">
        {t.terms.map((term, i) => (
          <span key={term} className={`flex items-center gap-2.5 rounded-xl bg-fg/[0.05] px-3 py-2 text-[12px] transition-[opacity,transform] duration-500 ${i < step ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`}>
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-coral text-on-coral"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
            <span className="truncate">{term}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Head2({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg/50">{children}</p>;
}

/** Deterministic example pool codes (no Math.random: server and client render the same list). */
const POOL = Array.from({ length: 24 }, (_, i) => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const n = (i * 7919 + 104729) % 1048576;
  return `ALP-${[0, 5, 10, 15].map((s) => a[(n >> s) % 32]).join("")}`;
});
const POOL_FREE = 248;

/** A partner's code pool: the top code is handed out with every sale, the rest move up. */
function PoolCard({ running, l }: CardProps) {
  const t = l.formats;
  const offset = useTicker(running, 1500) % (POOL.length - 4);
  return (
    <div className={`${CARD} flex flex-col`}>
      <div className="flex items-center justify-between"><Head2>{t.pool}</Head2><span className="-mt-2 text-[11px] tabular-nums text-fg/60">{POOL_FREE - offset} {t.free}</span></div>
      <div className="flex flex-col gap-1">
        {POOL.slice(offset, offset + 4).map((code, i) => (
          <span key={code} className={`tour-pop flex items-center justify-between rounded-lg px-3 py-1.5 font-mono text-[12px] ${i === 0 ? "bg-coral text-on-coral" : "bg-fg/[0.05] text-fg/80"}`}>
            {code}
            {i === 0 ? <span className="font-sans text-[10.5px] font-semibold">→ {t.assigned}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The same voucher as PDF and as wallet pass; the pass flips from «valid» to «redeemed». */
function PdfWalletCard({ running, still, l, locale }: CardProps) {
  const t = l.formats;
  const tick = useTickerMod(running, 1600, 4);
  const redeemed = !still && tick >= 2;
  const b = DEMO_BRANDS[0];
  const deal = DEMO_DEALS[0];
  return (
    <div className={`${CARD} flex items-center justify-center gap-4`}>
      <div className="relative h-[170px] w-[122px] shrink-0 rounded-md bg-white p-2.5 text-[#111] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.8)]">
        <div className="h-[40px] overflow-hidden rounded"><DealArt deal={deal} /></div>
        <p className="mt-1.5 truncate text-[9px] font-bold">{title(deal, locale)}</p>
        <span className="mt-1 block h-1 w-3/4 rounded bg-black/10" />
        <span className="mt-1 block h-1 w-1/2 rounded bg-black/10" />
        <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2"><QrSymbol size={52} /></span>
        <span className="absolute -right-2 -top-2 rounded bg-coral px-1.5 py-0.5 text-[9px] font-bold text-on-coral">{t.pdf}</span>
      </div>
      <div className="relative h-[170px] w-[132px] shrink-0 overflow-hidden rounded-xl p-2.5 shadow-[0_14px_30px_-14px_rgba(0,0,0,0.8)]" style={{ background: b.primary, color: b.onPrimary }}>
        <p className="flex items-center gap-1 text-[9px] font-semibold opacity-90"><Wallet className="h-3 w-3" />{b.name}</p>
        <p className="mt-2 text-[11.5px] font-bold leading-tight">{title(deal, locale)}</p>
        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-semibold transition-colors duration-500 ${redeemed ? "bg-black/30" : "bg-fg/25"}`}>
          <span key={redeemed ? "r" : "v"} className="stour-fade inline-block">{redeemed ? t.redeemed : t.valid}</span>
        </span>
        <span className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded bg-white p-1 transition-opacity duration-500 ${redeemed ? "opacity-40" : ""}`}><QrSymbol size={50} /></span>
      </div>
    </div>
  );
}

function useTickerMod(running: boolean, ms: number, mod: number) {
  return useTicker(running, ms) % mod;
}
