import type { ReactNode } from "react";

/**
 * Feature illustrations of the landing slider (feature-slider.tsx): calm and simple — one centred
 * object per card, few lines in warm greys, one coral accent, lots of space, no text (except «Stripe»).
 * Exactly one gentle movement each (`.fa-anim` + `.fa-<key>`, keyframes in features.css): paused until
 * the card is in view (site.css), still frame with reduced motion. ViewBox 600 × 300 (sliced): the motif
 * sits within x 170–430, so it stays whole at every card width.
 */

export const FEATURE_KEYS = ["brand", "domain", "money", "pdf", "wallet", "scan", "stock", "partners", "analytics", "team"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/* Light palette (the stages sit in light cards): white panels on a warm mist, warm greys for lines from
   faint (n1) to strong (light = the darkest accent line), coral as the one accent. */
const T = {
  bg1: "#ffffff", // panels
  bg2: "#f7f3f1", // recessed fills
  n1: "#ddd3ce",
  n2: "#bcafa9",
  n3: "#8f817b",
  light: "#4a3f3b",
  coral: "#ff4b23",
  ink: "#111111",
};
const SW = 2.5; // stroke width, identical in every illustration
const line = { strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <g transform="translate(300 150) scale(1.2) translate(-300 -150)">{children}</g>
    </svg>
  );
}

const anim = (key: string) => `fa-anim fa-${key}`;

/** One calm motif per feature: a single centred object, few lines, one gentle movement. */
const ART: Record<FeatureKey, ReactNode> = {
  // Brand: three colour swatches, the selection ring moves from one to the next.
  brand: (
    <g>
      <circle cx={250} cy={150} r={18} fill={T.coral} />
      <circle cx={300} cy={150} r={18} fill={T.light} />
      <circle cx={350} cy={150} r={18} fill={T.n1} />
      <circle className={anim("brand-ring")} cx={250} cy={150} r={28} stroke={T.light} {...line} />
    </g>
  ),
  // Domain: one address bar; the lock sits in coral, the address writes itself.
  domain: (
    <g>
      <rect x={170} y={126} width={260} height={48} rx={24} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <rect x={194} y={146} width={12} height={10} rx={2} fill={T.coral} />
      <path d="M196 146 v-4 a4 4 0 0 1 8 0 v4" stroke={T.coral} {...line} strokeWidth={2} />
      <rect className={anim("domain-type")} x={220} y={145} width={150} height={10} rx={5} fill={T.n2} />
    </g>
  ),
  // Money: buyer to shop along one line; the coin travels, «Stripe» names the rail.
  money: (
    <g>
      <line x1={226} y1={150} x2={374} y2={150} stroke={T.n1} {...line} />
      <circle cx={200} cy={150} r={24} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <circle cx={400} cy={150} r={24} fill={T.bg1} stroke={T.coral} strokeWidth={SW} />
      <text x={300} y={134} textAnchor="middle" fontSize={13} fontWeight={600} fill={T.n3} fontFamily="Inter, system-ui, sans-serif">Stripe</text>
      <circle className={anim("money-coin")} cx={232} cy={150} r={7} fill={T.coral} />
    </g>
  ),
  // PDF: a single voucher page, floating gently.
  pdf: (
    <g className={anim("pdf-doc")}>
      <rect x={255} y={70} width={90} height={160} rx={10} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <rect x={267} y={84} width={66} height={10} rx={5} fill={T.coral} />
      <rect x={267} y={104} width={50} height={6} rx={3} fill={T.n1} />
      <rect x={279} y={150} width={42} height={42} rx={6} stroke={T.n3} {...line} />
      <rect x={290} y={161} width={20} height={20} rx={3} fill={T.n2} />
    </g>
  ),
  // Wallet: two passes in the stack, the new one slides in on top.
  wallet: (
    <g>
      <rect x={240} y={96} width={120} height={78} rx={12} fill={T.bg1} stroke={T.n1} strokeWidth={SW} />
      <rect x={240} y={116} width={120} height={78} rx={12} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <g className={anim("wallet-pass")}>
        <rect x={240} y={136} width={120} height={78} rx={12} fill={T.coral} />
        <rect x={254} y={152} width={46} height={8} rx={4} fill="#ffffff" opacity={0.85} />
        <rect x={322} y={178} width={24} height={24} rx={4} fill="#ffffff" />
      </g>
    </g>
  ),
  // Scan: a code in its frame, the coral line passes over it.
  scan: (
    <g>
      <rect x={250} y={100} width={100} height={100} rx={12} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <rect x={266} y={116} width={22} height={22} rx={4} fill={T.light} />
      <rect x={312} y={116} width={22} height={22} rx={4} fill={T.light} />
      <rect x={266} y={162} width={22} height={22} rx={4} fill={T.light} />
      <rect x={314} y={164} width={10} height={10} rx={2} fill={T.n2} />
      <rect className={anim("scan-line")} x={242} y={104} width={116} height={3} rx={1.5} fill={T.coral} />
    </g>
  ),
  // Stock & period: a clock face, the hand turns.
  stock: (
    <g>
      <circle cx={300} cy={150} r={54} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <circle cx={300} cy={150} r={4} fill={T.coral} />
      <line className={anim("stock-hand")} x1={300} y1={150} x2={300} y2={112} stroke={T.coral} {...line} strokeWidth={3} />
    </g>
  ),
  // Partners & settlement: one statement, the coral total fills.
  partners: (
    <g>
      <rect x={250} y={80} width={100} height={140} rx={10} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <rect x={264} y={100} width={56} height={6} rx={3} fill={T.n1} />
      <rect x={264} y={118} width={72} height={6} rx={3} fill={T.n1} />
      <rect x={264} y={136} width={48} height={6} rx={3} fill={T.n1} />
      <rect x={264} y={190} width={72} height={10} rx={5} fill={T.bg2} />
      <rect className={anim("partners-total")} x={264} y={190} width={72} height={10} rx={5} fill={T.coral} />
    </g>
  ),
  // Analytics: four bars, the coral one grows.
  analytics: (
    <g>
      <line x1={226} y1={210} x2={374} y2={210} stroke={T.n1} {...line} />
      <rect x={238} y={160} width={22} height={50} rx={5} fill={T.n1} />
      <rect x={272} y={135} width={22} height={75} rx={5} fill={T.n2} />
      <rect x={306} y={150} width={22} height={60} rx={5} fill={T.n1} />
      <rect className={anim("analytics-bar")} x={340} y={100} width={22} height={110} rx={5} fill={T.coral} />
    </g>
  ),
  // Team, API & webhooks: three members, a signal pings next to them.
  team: (
    <g>
      <circle cx={262} cy={150} r={24} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <circle cx={298} cy={150} r={24} fill={T.bg1} stroke={T.n2} strokeWidth={SW} />
      <circle cx={334} cy={150} r={24} fill={T.bg1} stroke={T.light} strokeWidth={SW} />
      <circle cx={384} cy={150} r={6} fill={T.coral} />
      <circle className={anim("team-ping")} cx={384} cy={150} r={6} stroke={T.coral} {...line} strokeWidth={2} />
    </g>
  ),
};

export function FeatureArt({ id }: { id: FeatureKey }) {
  return <Frame>{ART[id]}</Frame>;
}
