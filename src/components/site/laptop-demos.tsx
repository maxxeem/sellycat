"use client";

import { BarChart3, Calendar, Check, ChevronDown, CreditCard, Globe, Handshake, Landmark, LayoutDashboard, Lock, Palette, ShoppingBag, Tag, Ticket, Upload } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { LogoIcon } from "@/components/brand";
import type { Dictionary } from "@/lib/i18n";
import { At, Cursor, Fill, useInView, useReducedMotion, useScenes } from "./demo-kit";
import { BrandMark, DEMO_BRANDS, DEMO_DEALS, DealArt, chf, discount, type DemoDeal } from "./demo-brands";
import "./steps.css";

type Labels = Dictionary["site"]["steps"]["demo"];

/**
 * The notebook of «So funktioniert es»: one animated Sellycat dashboard screen per step (set up the
 * shop, create a deal, sell and redeem), drawn at 1000 px design width inside the laptop's screen in
 * the light product look (Mist ground, white cards, Ink text, Coral accent). Each loops through three
 * scenes while its tab is selected and on screen; a mouse pointer does what a person would do. Data
 * is fictional (demo-brands.tsx). Under reduced motion every demo shows its finished state.
 */
export function StepDemo({ step, active, l }: { step: number; active: boolean; l: Labels }) {
  const [inView, setRef] = useInView("40px");
  const reduced = useReducedMotion();
  const running = inView && active && !reduced;
  const Demo = [SetupDemo, DealDemo, SellDemo][step] ?? SetupDemo;
  return (
    <div ref={setRef} className="absolute inset-0" data-testid={`step-demo-${step}`}>
      <Fill width={1000}><Demo l={l} running={running} reduced={reduced} /></Fill>
    </div>
  );
}

type SceneProps = { l: Labels; running: boolean; reduced: boolean };

/** Scene 3 = the finished state (reduced motion): everything static, no pointer, no crossfades. */
const DONE = 3;
const BRAND = DEMO_BRANDS[0];
const INK = "var(--ink-brand)";
const GRAY = "var(--gray)";
const OK = "#1a7f37";
const dealTitle = (d: DemoDeal, l: Labels) => d.title[l.lang === "de" ? "de" : "en"];
/** Local {n} fill (importing `fmt` from @/lib/i18n would pull both dictionaries into the client bundle). */
const fillN = (text: string, n: number) => text.replace("{n}", String(n));

const NAV_ICONS = [LayoutDashboard, Tag, Handshake, ShoppingBag, Ticket, Palette, Globe, CreditCard];

function Shell({ l, nav, title, action, running, cursor, children }: { l: Labels; nav: number; title: ReactNode; action?: ReactNode; running: boolean; cursor?: ReactNode; children: ReactNode }) {
  return (
    <div className="demo-root relative flex h-full w-full bg-[var(--mist)]" style={{ color: INK }} data-running={running ? "1" : "0"}>
      <aside className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-black/[0.06] bg-white px-3 py-5">
        <span className="mb-5 flex items-center gap-2 px-2 text-[17px] font-bold tracking-tight"><LogoIcon size={28} />Sellycat</span>
        {l.nav.map((name, i) => {
          const Icon = NAV_ICONS[i] ?? BarChart3;
          const on = i === nav;
          return (
            <span key={name} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] ${on ? "bg-coral/10 font-medium" : ""}`} style={on ? undefined : { color: GRAY }}>
              <Icon className={`h-4 w-4 ${on ? "text-coral-text" : ""}`} />{name}
            </span>
          );
        })}
      </aside>
      <main className="relative flex min-w-0 flex-1 flex-col px-8 py-6">
        <div className="mb-5 flex h-10 items-center justify-between">
          <div className="text-[24px] font-semibold tracking-tight">{title}</div>
          {action}
        </div>
        {children}
      </main>
      {cursor}
    </div>
  );
}

/**
 * One value replaced by another at `at` ms of scene `when`: before that scene `from`, after it `to`,
 * during it a crossfade (both stacked in one grid cell, so the size never jumps).
 */
function Swap({ p, when, at, from, to, className = "" }: { p: number; when: number; at: number; from: ReactNode; to: ReactNode; className?: string }) {
  if (p < when) return <div className={className}>{from}</div>;
  if (p > when) return <div className={className}>{to}</div>;
  return (
    <div className={`grid ${className}`}>
      <At out={at} className="col-start-1 row-start-1">{from}</At>
      <At at={at + 60} className="col-start-1 row-start-1">{to}</At>
    </div>
  );
}

/** Shown from `at` ms on (no fade): hands a second pointer over from the first. */
function From({ at, off = false, children }: { at: number; off?: boolean; children: ReactNode }) {
  return <span className={`pointer-events-none absolute inset-0 z-50 ${off ? "steps-off" : "steps-on"}`} style={{ ["--d" as string]: `${at}ms` }}>{children}</span>;
}

const vars = (v: Record<string, string>) => v as CSSProperties;

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block h-[18px] text-[13px] font-medium leading-[18px]" style={{ color: GRAY }}>{children}</span>;
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl bg-white shadow-[0_1px_2px_rgb(17_17_17/0.06),0_8px_24px_-12px_rgb(17_17_17/0.12)] ${className}`}>{children}</div>;
}

function Chip({ tone, children }: { tone: "ok" | "muted" | "coral"; children: ReactNode }) {
  const style = tone === "ok" ? { background: "rgb(26 127 55 / 0.1)", color: OK } : tone === "muted" ? { background: "rgb(17 17 17 / 0.06)", color: GRAY } : undefined;
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold ${tone === "coral" ? "bg-coral text-on-coral" : ""}`} style={style}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{children}
    </span>
  );
}

/* ---------- 1 · Set up the shop ---------- */

const SETUP = [3000, 2800, 3600];
const SWATCHES = ["#111111", BRAND.primary, "#0E7C66", "#F2B705", "#FF4B23"];
const DOMAIN = "deals.deine-firma.ch";

function SetupDemo({ l, running, reduced }: SceneProps) {
  const { index, cycle } = useScenes(SETUP, running);
  const p = reduced ? DONE : index;
  const logo = <BrandMark brand={BRAND} size={30} />;
  const cursor = p === 0 ? <Cursor from={[700, 480]} to={[432, 178]} at={300} /> : p === 1 ? <Cursor from={[460, 210]} to={[312, 288]} at={400} /> : p === 2 ? <Cursor from={[360, 300]} to={[300, 372]} at={200} dur={700} /> : null;
  return (
    <Shell l={l} nav={5} title={l.nav[5]} running={running} cursor={<span key={`c${cycle}`}>{cursor}</span>}>
      <div key={`${p}-${cycle}`} className="flex min-h-0 flex-1 gap-8">
        <Card className="w-[400px] shrink-0 self-start p-5">
          <Label>{l.logo}</Label>
          <div className="relative flex h-[96px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-black/15 text-[14px]" style={{ color: GRAY }}>
            <Swap p={p} when={0} at={1900} from={<span className="flex items-center gap-2"><Upload className="h-5 w-5" />{l.drop}</span>} to={logo} />
            {p === 0 ? (
              <At out={1850} className="absolute inset-x-6 bottom-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <span className="demo-fill block h-full rounded-full bg-coral" style={vars({ "--d": "1250ms", "--dur": "550ms" })} />
              </At>
            ) : null}
          </div>
          <div className="mt-5">
            <Label>{l.colour}</Label>
            <div className="flex h-8 gap-3">
              {SWATCHES.map((c, i) => (
                <span key={c} className="relative h-8 w-8 rounded-full ring-1 ring-inset ring-black/10" style={{ background: c }}>
                  {i === 1 && p >= 1 ? <span className={`absolute -inset-[5px] rounded-full border-2 ${p === 1 ? "steps-ring" : ""}`} style={{ borderColor: c, ["--d" as string]: "1350ms" }} /> : null}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <Label>{l.domain}</Label>
            <div className="flex h-11 items-center rounded-lg border border-black/10 bg-[var(--mist)] px-3 text-[14px]">
              {p < 2 ? <span style={{ color: GRAY }}>{l.domainPlaceholder}</span> : <span className={p === 2 ? "demo-type inline-block" : ""} style={vars({ "--d": "1000ms" })}>{DOMAIN}</span>}
            </div>
            <div className="mt-2 h-5 text-[13px]">
              {p >= 2 ? <At at={p === 2 ? 2200 : 0} className="flex items-center gap-1.5 font-medium" style={{ color: OK }}><Check className="h-4 w-4" />{l.dnsOk}</At> : null}
            </div>
          </div>
        </Card>
        <div className="w-[304px] shrink-0">
          <span className="mb-2 flex h-[18px] items-center gap-2 text-[13px] font-medium" style={{ color: GRAY }}><span className="steps-blink h-2 w-2 rounded-full bg-coral" />{l.preview}</span>
          <div className="relative">
            <MiniShop l={l} coloured={p >= 2} logo={<Swap p={p} when={0} at={2000} from={<span className="block h-4 w-24 rounded bg-black/10" />} to={<BrandMark brand={BRAND} size={20} />} />} bar={<Swap p={p} when={2} at={2300} from="shop.sellycat.com" to={DOMAIN} />} />
            {p === 1 ? (
              <div className="steps-fade absolute inset-0" style={vars({ "--d": "1450ms" })}>
                <MiniShop l={l} coloured logo={<BrandMark brand={BRAND} size={20} />} bar="shop.sellycat.com" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/** The customer's shop as the live preview shows it: neutral until a colour is picked. */
function MiniShop({ l, coloured, logo, bar }: { l: Labels; coloured: boolean; logo: ReactNode; bar: ReactNode }) {
  const primary = coloured ? BRAND.primary : "#d9d9d9";
  const onPrimary = coloured ? BRAND.onPrimary : "#555555";
  const r = coloured ? BRAND.radius : 10;
  return (
    <Card className="overflow-hidden">
      <div className="flex h-8 items-center gap-2 bg-[var(--mist)] px-3 text-[11px]" style={{ color: GRAY }}><Lock className="h-3 w-3" />{bar}</div>
      <div className="flex h-12 items-center justify-between px-4">{logo}<span className="h-6 w-6 rounded-full bg-black/[0.06]" /></div>
      <div className="mx-3 px-4 py-4" style={{ background: primary, color: onPrimary, borderRadius: r, fontFamily: coloured ? BRAND.font : undefined }}>
        <div className="text-[17px] font-bold leading-tight">{l.heroTitle}</div>
        <div className="mt-1 text-[12px] opacity-80">{l.heroText}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3">
        {[DEMO_DEALS[0], DEMO_DEALS[3]].map((d) => (
          <div key={d.id} className="min-w-0">
            <div className="h-[78px] overflow-hidden" style={{ borderRadius: r * 0.6 }}><DealArt deal={d} /></div>
            <div className="mt-2 truncate text-[12px] font-semibold">{dealTitle(d, l)}</div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-[12px] font-bold">{chf(d.priceCents)}</span>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: primary, color: onPrimary }}>{l.buy}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- 2 · Create a deal ---------- */

const DEAL_SCENES = [3000, 3200, 3400];
const DEAL = DEMO_DEALS[0];
const PARTNERS = [DEMO_DEALS[0].partner, DEMO_DEALS[3].partner, DEMO_DEALS[7].partner];

function DealDemo({ l, running, reduced }: SceneProps) {
  const { index, cycle } = useScenes(DEAL_SCENES, running);
  const p = reduced ? DONE : index;
  const title = dealTitle(DEAL, l);
  const status = <Swap key={`s${cycle}`} p={p} when={2} at={1300} from={<Chip tone="muted">{l.draft}</Chip>} to={<Chip tone="ok">{l.live}</Chip>} className="justify-items-end" />;
  const cursor =
    p === 0 ? (
      <>
        <From at={1300} off><Cursor from={[640, 420]} to={[452, 152]} at={200} dur={800} /></From>
        <From at={1300}><Cursor from={[452, 152]} to={[420, 198]} at={1300} dur={400} /></From>
      </>
    ) : p === 1 ? <Cursor from={[420, 198]} to={[400, 238]} at={100} dur={500} /> : p === 2 ? <Cursor from={[560, 400]} to={[452, 478]} at={300} /> : null;
  // Fields: `when` = the scene that fills them, `at` = when inside it.
  const field = (label: string, value: ReactNode, placeholder: ReactNode, when: number, at: number, typed = false) => (
    <div className="min-w-0">
      <Label>{label}</Label>
      <div className="flex h-11 items-center rounded-lg border border-black/10 bg-[var(--mist)] px-3 text-[14px]">
        <Swap p={p} when={when} at={at} from={<span style={{ color: GRAY }}>{placeholder}</span>} to={typed && p === when ? <span className="demo-type inline-block" style={vars({ "--d": `${at + 60}ms` })}>{value}</span> : value} className="min-w-0 flex-1" />
      </div>
    </div>
  );
  return (
    <Shell l={l} nav={1} title={<>{l.nav[1]} <span style={{ color: GRAY, opacity: 0.6 }}>/</span> {l.newDeal}</>} action={status} running={running} cursor={<span key={`c${cycle}`}>{cursor}</span>}>
      <div key={`${p}-${cycle}`} className="flex min-h-0 flex-1 gap-8">
        <Card className="relative w-[440px] shrink-0 self-start p-5">
          <div>
            <Label>{l.partner}</Label>
            <div className="flex h-11 items-center justify-between rounded-lg border border-black/10 bg-[var(--mist)] px-3 text-[14px]">
              <Swap p={p} when={0} at={1800} from={<span style={{ color: GRAY }}>{l.partnerPlaceholder}</span>} to={PARTNERS[0]} />
              <ChevronDown className="h-4 w-4" style={{ color: GRAY }} />
            </div>
            {p === 0 ? (
              <At at={1050} className="absolute inset-x-5 top-[94px] z-20">
                <At out={1800} className="rounded-lg bg-white p-1 text-[14px] shadow-[0_12px_32px_-8px_rgb(17_17_17/0.25)] ring-1 ring-black/[0.06]">
                  {PARTNERS.map((name, i) => <span key={name} className={`flex h-9 items-center rounded-md px-3 ${i === 0 ? "bg-coral/10 font-medium" : ""}`}>{name}</span>)}
                </At>
              </At>
            ) : null}
          </div>
          <div className="mt-4">{field(l.title, title, l.titlePlaceholder, 1, 600, true)}</div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {field(l.price, chf(DEAL.priceCents), "CHF", 1, 1600)}
            {field(l.value, chf(DEAL.valueCents), "CHF", 1, 1800)}
          </div>
          <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-4">
            {field(l.stock, "50", "", 1, 2100)}
            {field(l.window, <span className="flex items-center gap-2"><Calendar className="h-4 w-4" style={{ color: GRAY }} />{l.windowValue}</span>, "", 1, 2400)}
          </div>
          <div className="mt-6 flex h-11 items-center justify-center rounded-xl bg-coral text-[14px] font-semibold text-on-coral">{l.publish}</div>
          <div className="mt-3 h-5 text-[13px]">
            {p >= 2 ? <At at={p === 2 ? 1600 : 0} className="flex items-center gap-1.5 font-medium" style={{ color: OK }}><Check className="h-4 w-4" />{l.published}</At> : null}
          </div>
        </Card>
        <div className="w-[264px] shrink-0">
          <Card className="overflow-hidden">
            <div className="relative h-[150px]">
              <DealArt deal={DEAL} />
              <span className="absolute right-3 top-3 rounded-full bg-white/90 p-0.5">{status}</span>
            </div>
            <div className="p-4">
              <Swap p={p} when={0} at={1850} from={<span className="block h-3 w-20 rounded bg-black/10" />} to={<span className="text-[12px]" style={{ color: GRAY }}>{PARTNERS[0]}</span>} className="h-4" />
              <Swap p={p} when={1} at={1600} from={<span className="mt-1 block h-4 w-40 rounded bg-black/10" />} to={<span className="block text-[17px] font-semibold leading-tight">{title}</span>} className="mt-1.5 h-6" />
              <Swap
                p={p}
                when={1}
                at={1900}
                from={<span className="block h-5 w-28 rounded bg-black/10" />}
                to={
                  <span className="flex items-baseline gap-2">
                    <span className="text-[18px] font-bold">{chf(DEAL.priceCents)}</span>
                    <span className="text-[12px] line-through" style={{ color: GRAY }}>{chf(DEAL.valueCents)}</span>
                    <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-on-coral">−{discount(DEAL)}%</span>
                  </span>
                }
                className="mt-3 h-7"
              />
              <Swap p={p} when={1} at={2200} from={<span className="block h-3 w-24 rounded bg-black/10" />} to={<span className="text-[12px] font-medium" style={{ color: GRAY }}>{fillN(l.left, 50)}</span>} className="mt-2 h-4" />
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- 3 · Sell & redeem ---------- */

const SELL = [2600, 3400, 2800];
type Order = { name: string; deal: DemoDeal; cents: number };
/** Newest first: index 0 arrives in scene 2, index 1 in scene 1, index 2 in scene 0; the rest are older. */
const ORDERS: Order[] = [
  { name: "Noah S.", deal: DEMO_DEALS[7], cents: DEMO_DEALS[7].priceCents },
  { name: "Luca R.", deal: DEMO_DEALS[3], cents: DEMO_DEALS[3].priceCents },
  { name: "Mia K.", deal: DEMO_DEALS[0], cents: DEMO_DEALS[0].priceCents },
  { name: "Lea M.", deal: DEMO_DEALS[0], cents: DEMO_DEALS[0].priceCents * 2 },
  { name: "Elias B.", deal: DEMO_DEALS[2], cents: DEMO_DEALS[2].priceCents },
  { name: "Sofia G.", deal: DEMO_DEALS[3], cents: DEMO_DEALS[3].priceCents },
];
const VOUCHERS = [
  { code: "KATER-4F7Q", deal: DEMO_DEALS[0], used: true },
  { code: "KATER-9MXA", deal: DEMO_DEALS[0], used: false },
  { code: "AURORA-2KD8", deal: DEMO_DEALS[3], used: false },
  { code: "MIRA-7TPW", deal: DEMO_DEALS[7], used: false },
];
const ROW = 64;
const ARRIVE = [400, 300, 400];

function SellDemo({ l, running, reduced }: SceneProps) {
  const { index, cycle } = useScenes(SELL, running);
  const p = reduced ? DONE : index;
  const arrive = ARRIVE[p] ?? 0;
  const rows = ORDERS.slice(Math.max(0, 2 - p));
  const sold = 12 + Math.min(p, 2);
  const counter = (n: number) => <span className="block text-[30px] font-bold leading-none tabular-nums">{n}</span>;
  const cursor = p === 1 ? <Cursor from={[700, 560]} to={[916, 330]} at={900} dur={1000} /> : null;
  return (
    <Shell l={l} nav={0} title={l.overview} action={<Chip tone="muted">{l.sample}</Chip>} running={running} cursor={<span key={`c${cycle}`}>{cursor}</span>}>
      <div key={`${p}-${cycle}`} className="flex min-h-0 flex-1 flex-col">
        <div className="grid h-[92px] shrink-0 grid-cols-[1fr_1fr_1.6fr] gap-4">
          <Card className="flex flex-col justify-between p-4">
            <span className="text-[13px] font-medium" style={{ color: GRAY }}>{l.sold}</span>
            {p === DONE ? counter(15) : <Swap p={0} when={0} at={arrive + 100} from={counter(sold)} to={counter(sold + 1)} />}
          </Card>
          <Card className="flex flex-col justify-between p-4">
            <span className="text-[13px] font-medium" style={{ color: GRAY }}>{l.redeemed}</span>
            <Swap p={p} when={1} at={2100} from={counter(5)} to={counter(6)} />
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral/10 text-coral-text"><Landmark className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold leading-snug">{l.payout}</span>
              <span className="mt-0.5 block text-[12px]" style={{ color: GRAY }}>{l.payoutHint}</span>
            </span>
          </Card>
        </div>
        <div className="mt-5 flex min-h-0 flex-1 gap-5">
          <Card className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
            <span className="mb-3 flex h-5 items-center justify-between text-[14px] font-semibold">
              {l.orders}
              <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: OK }}><span className="steps-blink h-2 w-2 rounded-full" style={{ background: OK }} />{l.live}</span>
            </span>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className={p === DONE ? "" : "steps-push"} style={vars({ "--d": `${arrive}ms`, "--h": `${ROW}px` })}>
                {rows.map((o, i) => (
                  <div key={o.name} className={`flex h-[56px] items-center gap-3 rounded-xl px-2 ${i === 0 ? "bg-coral/[0.07]" : ""} ${i === 0 && p !== DONE ? "steps-fade" : ""}`} style={{ marginBottom: ROW - 56, ["--d" as string]: `${arrive + 150}ms` }}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-[12px] font-semibold">{o.name.split(" ").map((s) => s[0]).join("")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{o.name}</span>
                      <span className="block truncate text-[12px]" style={{ color: GRAY }}>{dealTitle(o.deal, l)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[14px] font-semibold tabular-nums">{chf(o.cents)}</span>
                      <span className="block text-[11px]" style={{ color: GRAY }}>{i === 0 ? l.justNow : fillN(l.minutesAgo, i * 4 + 2)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="w-[300px] shrink-0 self-start p-4">
            <span className="mb-3 block h-5 text-[14px] font-semibold">{l.vouchers}</span>
            {VOUCHERS.map((v, i) => {
              const valid = (
                <span className="flex items-center gap-2">
                  <Chip tone="ok">{l.valid}</Chip>
                  <span className="flex h-7 w-[72px] items-center justify-center rounded-lg border border-black/15 text-[12px] font-medium">{l.redeem}</span>
                </span>
              );
              const used = <span className="flex justify-end"><Chip tone="muted">{l.used}</Chip></span>;
              return (
                <div key={v.code} className="flex h-[52px] items-center justify-between gap-2 border-b border-black/[0.06] last:border-0" style={{ marginBottom: i < VOUCHERS.length - 1 ? 8 : 0 }}>
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] font-semibold">{v.code}</span>
                    <span className="block truncate text-[11px]" style={{ color: GRAY }}>{dealTitle(v.deal, l)}</span>
                  </span>
                  {i === 1 ? <Swap p={p} when={1} at={2000} from={valid} to={used} className="justify-items-end" /> : v.used ? used : valid}
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
