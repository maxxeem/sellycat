import type { ReactNode } from "react";

/**
 * Feature illustrations of the landing slider (feature-slider.tsx), drawn in the style of the reference landing's
 * generated feature art: thin strokes in warm greys on ink, quiet surfaces, one coral accent, no text
 * (except «Stripe» as a word). Each motif has one or two animated elements (`.fa-anim` + `.fa-<key>-*`,
 * keyframes in features.css): paused until the card is in view (site.css), still frame with reduced
 * motion. Wide viewBox (600 × 300, sliced), so the motif fills the card stage at every breakpoint;
 * keep content within x 70–530, y 25–275.
 */

export const FEATURE_KEYS = ["brand", "domain", "money", "pdf", "wallet", "scan", "stock", "partners", "analytics", "team"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

const T = {
  bg0: "#221613", // site-raise
  bg1: "#1a1a1a", // site-surface
  bg2: "#111111", // site-ground
  n1: "#3a3330",
  n2: "#5a4d48",
  n3: "#857570",
  light: "#d9d2ce",
  coral: "#ff4b23",
  ink: "#111111",
};
const SW = 2.5; // stroke width, identical in every illustration
const line = { strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function Frame({ id, children }: { id: FeatureKey; children: ReactNode }) {
  return (
    <svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <radialGradient id={`fa-bg-${id}`} cx="50%" cy="38%" r="72%">
          <stop offset="0" stopColor={T.bg0} />
          <stop offset="0.55" stopColor={T.bg1} />
          <stop offset="1" stopColor={T.bg2} />
        </radialGradient>
      </defs>
      <rect width="600" height="300" fill={`url(#fa-bg-${id})`} />
      {children}
    </svg>
  );
}

/** Abstract profile: head circle over a shoulder arc. */
function Person({ cx, cy, stroke }: { cx: number; cy: number; stroke: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy - 30} r={16} fill={T.bg1} stroke={stroke} strokeWidth={SW} />
      <path d={`M${cx - 32} ${cy + 38} a32 32 0 0 1 64 0`} fill={T.bg1} stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </g>
  );
}

/** QR-like pattern: three finder squares and a few fixed modules (decorative, not a real code). */
function Qr({ x, y, size, stroke }: { x: number; y: number; size: number; stroke: string }) {
  const f = size * 0.28, m = size / 10;
  const finders = [[x, y], [x + size - f, y], [x, y + size - f]];
  const modules = [[4, 0], [5, 1], [4, 3], [6, 4], [3, 5], [5, 5], [8, 5], [4, 7], [6, 7], [7, 8], [9, 6], [5, 9], [8, 9], [9, 9]];
  return (
    <g>
      {finders.map(([fx, fy], i) => (
        <g key={i}>
          <rect x={fx} y={fy} width={f} height={f} rx={3} fill="none" stroke={stroke} strokeWidth={SW} />
          <rect x={fx + f * 0.3} y={fy + f * 0.3} width={f * 0.4} height={f * 0.4} rx={1.5} fill={stroke} />
        </g>
      ))}
      {modules.map(([cx, cy], i) => <rect key={i} x={x + cx * m} y={y + cy * m} width={m * 0.8} height={m * 0.8} rx={1} fill={stroke} />)}
    </g>
  );
}

const MOTIFS: Record<FeatureKey, () => ReactNode> = {
  // A shop frame and three colour swatches: the selection ring hops between swatches, logo and button follow.
  brand: () => (
    <>
      <rect x={170} y={50} width={220} height={200} rx={18} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <line x1={170} y1={92} x2={390} y2={92} stroke={T.n1} {...line} />
      <circle cx={194} cy={71} r={10} fill={T.light} />
      <rect x={214} y={67} width={60} height={8} rx={4} fill={T.n1} />
      <rect x={190} y={108} width={180} height={70} rx={10} {...line} stroke={T.n1} />
      <rect x={190} y={194} width={120} height={8} rx={4} fill={T.n1} />
      <rect x={190} y={210} width={80} height={8} rx={4} fill={T.n1} />
      <rect x={300} y={214} width={70} height={22} rx={11} fill={T.light} />
      <g className="fa-anim fa-brand-tint">
        <circle cx={194} cy={71} r={10} fill={T.coral} />
        <rect x={300} y={214} width={70} height={22} rx={11} fill={T.coral} />
      </g>
      <circle cx={440} cy={105} r={14} fill={T.coral} />
      <circle cx={440} cy={150} r={14} fill={T.light} />
      <circle cx={440} cy={195} r={14} fill={T.n2} />
      <circle className="fa-anim fa-brand-ring" cx={440} cy={105} r={21} stroke={T.light} {...line} strokeWidth={2} />
    </>
  ),
  // An address bar: the domain types itself in, then the lock appears; a page sketch below.
  domain: () => (
    <>
      <rect x={120} y={70} width={360} height={44} rx={22} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <g className="fa-anim fa-domain-lock">
        <path d="M144 90 v-5 a6 6 0 0 1 12 0 v5" stroke={T.coral} {...line} />
        <rect x={140} y={89} width={20} height={15} rx={3} fill={T.coral} />
      </g>
      <rect className="fa-anim fa-domain-type" x={172} y={87} width={110} height={10} rx={5} fill={T.light} />
      <rect x={290} y={87} width={70} height={10} rx={5} fill={T.n1} />
      <rect x={150} y={136} width={300} height={130} rx={14} stroke={T.n1} {...line} />
      <rect x={172} y={156} width={120} height={10} rx={5} fill={T.n1} />
      <rect x={172} y={176} width={200} height={8} rx={4} fill={T.n1} opacity={0.6} />
      {[172, 262, 352].map((x) => <rect key={x} x={x} y={202} width={76} height={46} rx={8} stroke={T.n1} {...line} />)}
    </>
  ),
  // Buyer card → «Stripe» rail → the customer's account; Sellycat sits small below and only keeps a fee.
  money: () => (
    <>
      <g opacity={0.75}>
        <line x1={300} y1={141} x2={300} y2={198} stroke={T.n1} {...line} strokeDasharray="3 7" />
        <circle cx={300} cy={172} r={3} fill={T.n3} />
        <path d="M287 213 l3 -14 l9 8 M313 213 l-3 -14 l-9 8" stroke={T.n1} {...line} />
        <circle cx={300} cy={222} r={16} fill={T.bg2} stroke={T.n1} strokeWidth={SW} />
      </g>
      <rect x={70} y={95} width={120} height={80} rx={12} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <rect x={86} y={111} width={22} height={16} rx={4} stroke={T.n2} {...line} />
      <rect x={86} y={147} width={70} height={7} rx={3.5} fill={T.n1} />
      <rect x={86} y={160} width={40} height={7} rx={3.5} fill={T.n1} />
      <line x1={198} y1={135} x2={402} y2={135} stroke={T.n2} {...line} />
      <text x={300} y={120} textAnchor="middle" fontSize={15} fontWeight={600} letterSpacing={0.5} fill={T.n3} fontFamily="inherit">Stripe</text>
      <rect x={410} y={80} width={120} height={110} rx={14} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <circle cx={432} cy={104} r={9} stroke={T.n2} {...line} />
      <rect x={450} y={100} width={58} height={8} rx={4} fill={T.n1} />
      <rect x={428} y={128} width={50} height={8} rx={4} fill={T.n2} />
      <rect x={428} y={154} width={84} height={10} rx={5} fill={T.n1} />
      <rect className="fa-anim fa-money-balance" x={428} y={154} width={84} height={10} rx={5} fill={T.coral} />
      <circle className="fa-anim fa-money-coin" cx={206} cy={135} r={9} fill={T.coral} />
    </>
  ),
  // A voucher page slides out of an open envelope.
  pdf: () => (
    <>
      <defs>
        <clipPath id="fa-pdf-clip"><rect x={150} y={0} width={300} height={262} /></clipPath>
      </defs>
      <rect x={200} y={140} width={200} height={125} rx={12} fill={T.bg2} stroke={T.n2} strokeWidth={SW} />
      <path d="M202 146 L300 98 L398 146" stroke={T.n1} {...line} />
      <g clipPath="url(#fa-pdf-clip)">
        <g className="fa-anim fa-pdf-page">
          <rect x={228} y={40} width={144} height={176} rx={8} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
          <rect x={242} y={54} width={116} height={14} rx={4} fill={T.coral} />
          <Qr x={244} y={82} size={40} stroke={T.n2} />
          <rect x={296} y={86} width={60} height={7} rx={3.5} fill={T.n1} />
          <rect x={296} y={100} width={44} height={7} rx={3.5} fill={T.n1} />
          <rect x={244} y={136} width={110} height={7} rx={3.5} fill={T.n1} />
          <line x1={236} y1={160} x2={364} y2={160} stroke={T.n1} {...line} strokeDasharray="3 6" />
          <rect x={244} y={174} width={80} height={7} rx={3.5} fill={T.n1} />
          <rect x={244} y={188} width={56} height={7} rx={3.5} fill={T.n1} />
        </g>
      </g>
      <path d="M200 175 L300 225 L400 175 V253 a12 12 0 0 1 -12 12 H212 a12 12 0 0 1 -12 -12 Z" fill={T.bg1} stroke={T.n2} strokeWidth={SW} strokeLinejoin="round" />
    </>
  ),
  // A pass slides into the wallet stack; a check marks it as updated.
  wallet: () => (
    <>
      <rect x={190} y={92} width={220} height={120} rx={14} fill={T.bg1} stroke={T.n1} strokeWidth={SW} />
      <rect x={190} y={114} width={220} height={120} rx={14} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <g className="fa-anim fa-wallet-pass">
        <rect x={190} y={138} width={220} height={120} rx={14} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
        <rect x={206} y={152} width={64} height={10} rx={5} fill={T.coral} />
        <rect x={206} y={172} width={110} height={7} rx={3.5} fill={T.n1} />
        <rect x={340} y={152} width={50} height={10} rx={5} fill={T.n2} />
        <g className="fa-anim fa-wallet-check">
          <circle cx={384} cy={180} r={9} fill={T.coral} />
          <path d="M379.5 180 l3 3 l6 -6.5" stroke={T.ink} {...line} />
        </g>
      </g>
      <rect x={176} y={198} width={248} height={80} rx={18} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <line x1={194} y1={214} x2={406} y2={214} stroke={T.n1} {...line} strokeDasharray="3 7" />
    </>
  ),
  // A phone camera over a QR: the scan line sweeps, then the green light is a coral check.
  scan: () => (
    <>
      <rect x={240} y={28} width={120} height={250} rx={22} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <rect x={284} y={40} width={32} height={6} rx={3} fill={T.n1} />
      <Qr x={262} y={84} size={76} stroke={T.n3} />
      <path d="M252 88 v-14 h14 M334 74 h14 v14 M348 156 v14 h-14 M266 170 h-14 v-14" stroke={T.coral} {...line} />
      <rect className="fa-anim fa-scan-line" x={256} y={80} width={88} height={3} rx={1.5} fill={T.coral} />
      <g className="fa-anim fa-scan-ok">
        <circle cx={300} cy={212} r={16} fill={T.coral} />
        <path d="M292 212 l6 6 l11 -12" stroke={T.ink} {...line} strokeWidth={3} />
      </g>
      <rect x={270} y={240} width={60} height={7} rx={3.5} fill={T.n1} />
    </>
  ),
  // Stock bar running low next to a countdown dial.
  stock: () => (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={96 + i * 40} y={86} width={30} height={22} rx={5} stroke={i < 3 ? T.n1 : T.n3} {...line} />
      ))}
      <rect x={96} y={136} width={190} height={12} rx={6} fill={T.n1} />
      <rect className="fa-anim fa-stock-bar" x={96} y={136} width={190} height={12} rx={6} fill={T.coral} />
      <rect x={96} y={168} width={90} height={8} rx={4} fill={T.n2} />
      <rect x={96} y={184} width={60} height={8} rx={4} fill={T.n1} />
      <circle cx={420} cy={150} r={58} stroke={T.n1} {...line} />
      <path d="M420 92 A58 58 0 1 1 362 150" stroke={T.coral} {...line} strokeWidth={3.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1={420 + Math.sin(a) * 44} y1={150 - Math.cos(a) * 44} x2={420 + Math.sin(a) * 48} y2={150 - Math.cos(a) * 48} stroke={T.n2} {...line} strokeWidth={2} />;
      })}
      <line className="fa-anim fa-stock-hand" x1={420} y1={150} x2={420} y2={112} stroke={T.light} {...line} />
      <circle cx={420} cy={150} r={4.5} fill={T.coral} />
    </>
  ),
  // Two partner tiles feed a settlement: rows get ticked off one by one, the total grows.
  partners: () => (
    <>
      {[58, 168].map((y) => (
        <g key={y}>
          <rect x={80} y={y} width={150} height={74} rx={14} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
          <path d={`M98 ${y + 28} h32 l-4 -10 h-24 z M101 ${y + 28} v18 h26 v-18`} stroke={T.n3} {...line} />
          <rect x={142} y={y + 26} width={70} height={8} rx={4} fill={T.n1} />
          <rect x={142} y={y + 42} width={46} height={8} rx={4} fill={T.n1} />
        </g>
      ))}
      <path d="M230 95 C 280 95, 290 140, 338 140 M230 205 C 280 205, 290 160, 338 160" stroke={T.n1} {...line} strokeDasharray="4 6" />
      <rect x={340} y={40} width={170} height={220} rx={12} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <rect x={358} y={58} width={70} height={10} rx={5} fill={T.n2} />
      <g className="fa-anim fa-settle-tick">
        <rect x={350} y={84} width={150} height={24} rx={6} fill={T.coral} opacity={0.14} />
        <path d="M486 96 l3.5 3.5 l7 -7.5" stroke={T.coral} {...line} />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={358} y={92 + i * 30} width={70} height={8} rx={4} fill={T.n1} />
          <rect x={440} y={92 + i * 30} width={36} height={8} rx={4} fill={T.n2} />
        </g>
      ))}
      <line x1={358} y1={212} x2={492} y2={212} stroke={T.n1} {...line} />
      <rect x={358} y={226} width={50} height={10} rx={5} fill={T.n2} />
      <rect className="fa-anim fa-settle-total" x={432} y={224} width={60} height={14} rx={7} fill={T.coral} />
    </>
  ),
  // Live mini charts: the revenue line draws itself, sold (grey) and redeemed (coral) bars grow.
  analytics: () => (
    <>
      <defs>
        <clipPath id="fa-analytics-clip"><rect className="fa-anim fa-analytics-reveal" x={84} y={60} width={226} height={180} /></clipPath>
      </defs>
      <rect x={70} y={50} width={250} height={200} rx={14} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      {[100, 140, 180, 220].map((y) => <line key={y} x1={90} y1={y} x2={300} y2={y} stroke={T.n1} {...line} opacity={0.55} />)}
      <g clipPath="url(#fa-analytics-clip)">
        <path d="M90 214 C 120 206, 140 180, 165 186 S 210 150, 235 140 S 275 96, 300 84" stroke={T.coral} {...line} strokeWidth={3} />
        <circle cx={300} cy={84} r={5} fill={T.coral} />
      </g>
      <rect x={340} y={50} width={190} height={200} rx={14} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <circle cx={362} cy={72} r={4} fill={T.n3} />
      <rect x={372} y={69} width={30} height={6} rx={3} fill={T.n1} />
      <circle cx={420} cy={72} r={4} fill={T.coral} />
      <rect x={430} y={69} width={30} height={6} rx={3} fill={T.n1} />
      <g className="fa-anim fa-analytics-bars">
        {[[60, 38], [92, 64], [74, 50], [120, 88]].map(([sold, redeemed], i) => (
          <g key={i}>
            <rect x={364 + i * 38} y={222 - sold} width={12} height={sold} rx={3} fill={T.n3} />
            <rect x={380 + i * 38} y={222 - redeemed} width={12} height={redeemed} rx={3} fill={T.coral} />
          </g>
        ))}
      </g>
      <line x1={358} y1={222} x2={512} y2={222} stroke={T.n1} {...line} />
    </>
  ),
  // Team with roles → API → webhook endpoint: an event pulse travels and pings on arrival.
  team: () => (
    <>
      <Person cx={112} cy={160} stroke={T.n1} />
      <Person cx={212} cy={160} stroke={T.n2} />
      <Person cx={162} cy={176} stroke={T.coral} />
      <rect x={102} y={236} width={40} height={8} rx={4} fill={T.n1} />
      <rect x={152} y={236} width={40} height={8} rx={4} fill={T.n2} />
      <rect x={202} y={236} width={40} height={8} rx={4} fill={T.n1} />
      <rect x={262} y={132} width={46} height={36} rx={10} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <path d="M279 144 l-6 6 l6 6 M291 144 l6 6 l-6 6" stroke={T.n3} {...line} />
      <line x1={308} y1={150} x2={400} y2={150} stroke={T.n2} {...line} strokeDasharray="4 6" />
      <rect x={400} y={105} width={130} height={90} rx={14} fill={T.bg1} stroke={T.n3} strokeWidth={SW} />
      <circle cx={420} cy={128} r={5} fill={T.coral} />
      <circle className="fa-anim fa-team-ping" cx={420} cy={128} r={10} stroke={T.coral} {...line} strokeWidth={2} />
      <rect x={434} y={124} width={70} height={8} rx={4} fill={T.n1} />
      <rect x={420} y={148} width={90} height={7} rx={3.5} fill={T.n1} />
      <rect x={420} y={166} width={60} height={7} rx={3.5} fill={T.n1} />
      <circle className="fa-anim fa-team-pulse" cx={316} cy={150} r={6} fill={T.coral} />
    </>
  ),
};

/** Inline illustration for one feature card (decorative). */
export function FeatureArt({ id }: { id: FeatureKey }) {
  return <Frame id={id}>{MOTIFS[id]()}</Frame>;
}
