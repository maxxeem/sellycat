/**
 * Fictional example brands and deals for the landing page animations. Invented names and code-drawn
 * artwork only (no real logos, no stock photos). Colours here are the fictional shops' own brand
 * colours inside the mockups, not Sellycat's palette.
 */

export type Motif = "coffee" | "mountain" | "spa" | "cinema" | "bike" | "books" | "pizza" | "lake";

export type DemoDeal = {
  id: string;
  title: { de: string; en: string };
  partner: string;
  priceCents: number;
  valueCents: number;
  left: number;
  motif: Motif;
  hue: [string, string];
};

export type DemoBrand = {
  id: string;
  name: string;
  domain: string;
  primary: string;
  onPrimary: string;
  surface: string;
  ink: string;
  font: string;
  radius: number;
  mark: "wave" | "circle" | "tower";
};

/** Three customers, three looks: the same shop software, styled per customer. */
export const DEMO_BRANDS: DemoBrand[] = [
  { id: "radio", name: "Radio Pfote", domain: "deals.radiopfote.ch", primary: "#6D3BFF", onPrimary: "#FFFFFF", surface: "#F4F0FF", ink: "#1B1033", font: "Inter, system-ui, sans-serif", radius: 18, mark: "wave" },
  { id: "city", name: "Seestadt erleben", domain: "gutscheine.seestadt.ch", primary: "#0E7C66", onPrimary: "#FFFFFF", surface: "#EEF7F4", ink: "#0B2620", font: "Georgia, 'Times New Roman', serif", radius: 6, mark: "tower" },
  { id: "club", name: "Gewerbeverein Nord", domain: "vorteile.gv-nord.ch", primary: "#F2B705", onPrimary: "#111111", surface: "#FFF9E6", ink: "#2A2200", font: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif", radius: 28, mark: "circle" },
];

export const DEMO_DEALS: DemoDeal[] = [
  { id: "brunch", title: { de: "Brunch für zwei", en: "Brunch for two" }, partner: "Café Kater", priceCents: 3900, valueCents: 6000, left: 7, motif: "coffee", hue: ["#F6B26B", "#B4532A"] },
  { id: "alp", title: { de: "Tageskarte Bergbahn", en: "Mountain railway day pass" }, partner: "Bergbahn Falkenalp", priceCents: 4500, valueCents: 7200, left: 23, motif: "mountain", hue: ["#8EC5FC", "#2F5D8A"] },
  { id: "spa", title: { de: "Spa-Abend mit Sauna", en: "Spa evening with sauna" }, partner: "Spa Lindengarten", priceCents: 5900, valueCents: 9000, left: 12, motif: "spa", hue: ["#B8E1D0", "#3E7C6B"] },
  { id: "kino", title: { de: "2 Kinotickets mit Popcorn", en: "2 cinema tickets with popcorn" }, partner: "Kino Aurora", priceCents: 2900, valueCents: 4400, left: 41, motif: "cinema", hue: ["#F7797D", "#6A2C70"] },
  { id: "velo", title: { de: "Velo-Service komplett", en: "Full bike service" }, partner: "Velowerk Nord", priceCents: 6900, valueCents: 11000, left: 5, motif: "bike", hue: ["#C9F0A3", "#4C7A2A"] },
  { id: "buch", title: { de: "Büchergutschein CHF 50", en: "Book voucher CHF 50" }, partner: "Buchladen Seitenwind", priceCents: 4000, valueCents: 5000, left: 18, motif: "books", hue: ["#FFD8A8", "#9C5B17"] },
  { id: "pizza", title: { de: "Pizza-Abend für vier", en: "Pizza night for four" }, partner: "Pizzeria Fortuna", priceCents: 4900, valueCents: 8000, left: 9, motif: "pizza", hue: ["#FFB199", "#C0392B"] },
  { id: "see", title: { de: "Stand-up-Paddle 2 Stunden", en: "Stand-up paddle, 2 hours" }, partner: "Seebad Mira", priceCents: 2500, valueCents: 4000, left: 30, motif: "lake", hue: ["#A1E3F9", "#1F6F8B"] },
];

export const chf = (cents: number) => `CHF ${Number.isInteger(cents / 100) ? `${cents / 100}.–` : (cents / 100).toFixed(2)}`;
export const discount = (d: DemoDeal) => Math.round((1 - d.priceCents / d.valueCents) * 100);

/** Code-drawn deal artwork: a gradient sky and a simple scene per motif (fills its box). */
export function DealArt({ deal, className = "" }: { deal: Pick<DemoDeal, "id" | "motif" | "hue">; className?: string }) {
  const [a, b] = deal.hue;
  const g = `g-${deal.id}`;
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${g})`} />
      <circle cx="122" cy="30" r="16" fill="#fff" opacity="0.35" />
      {MOTIFS[deal.motif]}
    </svg>
  );
}

const W = "#ffffff";
const MOTIFS: Record<Motif, React.ReactNode> = {
  coffee: (
    <g fill={W}>
      <rect x="50" y="56" width="48" height="40" rx="8" opacity="0.92" />
      <path d="M98 64h8a10 10 0 0 1 0 20h-8v-6h8a4 4 0 0 0 0-8h-8z" opacity="0.92" />
      <rect x="40" y="96" width="80" height="6" rx="3" opacity="0.7" />
      <path d="M62 50c-4-6 4-8 0-14M74 50c-4-6 4-8 0-14M86 50c-4-6 4-8 0-14" stroke={W} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
  mountain: (
    <g>
      <path d="M0 120 L48 52 L72 82 L104 40 L160 120 Z" fill={W} opacity="0.85" />
      <path d="M96 52 L104 40 L112 52 L106 50 L104 54 L100 50 Z" fill={W} />
      <path d="M0 120 L30 92 L60 120 Z" fill={W} opacity="0.5" />
      <line x1="20" y1="30" x2="140" y2="78" stroke={W} strokeWidth="1.5" opacity="0.7" />
      <rect x="70" y="52" width="14" height="10" rx="2" fill={W} />
    </g>
  ),
  spa: (
    <g fill={W}>
      <ellipse cx="80" cy="96" rx="56" ry="10" opacity="0.5" />
      <ellipse cx="66" cy="86" rx="18" ry="10" opacity="0.92" />
      <ellipse cx="94" cy="84" rx="16" ry="9" opacity="0.8" />
      <path d="M80 40c10 10 10 26 0 34c-10-8-10-24 0-34z" opacity="0.92" />
      <path d="M80 74c-14-2-24-12-26-24c12 0 22 8 26 24zM80 74c14-2 24-12 26-24c-12 0-22 8-26 24z" opacity="0.7" />
    </g>
  ),
  cinema: (
    <g fill={W}>
      <rect x="34" y="34" width="92" height="54" rx="6" opacity="0.9" />
      <path d="M72 50l20 11-20 11z" fill="#000" opacity="0.35" />
      <path d="M52 100l6-12h44l6 12z" opacity="0.7" />
      <circle cx="40" cy="100" r="5" opacity="0.6" />
      <circle cx="120" cy="100" r="5" opacity="0.6" />
    </g>
  ),
  bike: (
    <g fill="none" stroke={W} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.92">
      <circle cx="50" cy="84" r="18" />
      <circle cx="112" cy="84" r="18" />
      <path d="M50 84l20-30h30l12 30M70 54l14 30h28M96 46h12" />
    </g>
  ),
  books: (
    <g fill={W}>
      <rect x="42" y="44" width="16" height="56" rx="2" opacity="0.92" />
      <rect x="60" y="36" width="18" height="64" rx="2" opacity="0.75" />
      <rect x="80" y="48" width="14" height="52" rx="2" opacity="0.92" />
      <rect x="96" y="40" width="20" height="60" rx="2" transform="rotate(10 106 70)" opacity="0.7" />
      <rect x="34" y="100" width="92" height="5" rx="2" opacity="0.6" />
    </g>
  ),
  pizza: (
    <g>
      <circle cx="80" cy="72" r="38" fill={W} opacity="0.92" />
      <circle cx="80" cy="72" r="30" fill="#000" opacity="0.12" />
      <circle cx="68" cy="62" r="6" fill={W} />
      <circle cx="92" cy="66" r="6" fill={W} />
      <circle cx="78" cy="86" r="6" fill={W} />
      <path d="M80 72L80 34" stroke={W} strokeWidth="2" opacity="0.8" />
      <path d="M80 72L114 90" stroke={W} strokeWidth="2" opacity="0.8" />
    </g>
  ),
  lake: (
    <g fill={W}>
      <path d="M0 88c20-6 40 6 60 0s40-6 60 0s30 4 40 0v32H0z" opacity="0.6" />
      <path d="M0 100c20-6 40 6 60 0s40-6 60 0s30 4 40 0v20H0z" opacity="0.85" />
      <rect x="56" y="76" width="50" height="6" rx="3" />
      <rect x="80" y="44" width="4" height="34" rx="2" />
      <circle cx="82" cy="40" r="5" />
    </g>
  ),
};

/** Fictional shop logo: a simple mark + the name in the shop's font. */
export function BrandMark({ brand, size = 22 }: { brand: DemoBrand; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2" style={{ fontFamily: brand.font, color: brand.ink }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx={brand.mark === "circle" ? 12 : brand.mark === "tower" ? 3 : 7} fill={brand.primary} />
        {brand.mark === "wave" ? <path d="M5 13c2-3 4-3 6 0s4 3 6 0" stroke={brand.onPrimary} strokeWidth="2.2" fill="none" strokeLinecap="round" /> : null}
        {brand.mark === "tower" ? <path d="M9 18V9l3-3 3 3v9zM7 18h10" stroke={brand.onPrimary} strokeWidth="1.8" fill="none" strokeLinejoin="round" /> : null}
        {brand.mark === "circle" ? <circle cx="12" cy="12" r="5" fill="none" stroke={brand.onPrimary} strokeWidth="2.2" /> : null}
      </svg>
      <span style={{ fontWeight: 700, fontSize: size * 0.72, letterSpacing: "-0.01em" }}>{brand.name}</span>
    </span>
  );
}
