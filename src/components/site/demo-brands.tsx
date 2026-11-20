/**
 * Fictional example brands and deals for the landing page animations. Invented shop and partner names,
 * no real logos. Deal photos are professional photographs from Unsplash (Unsplash License: free for
 * commercial use, no attribution required), served by Unsplash's image CDN in one size per photo.
 * Colours here are the fictional shops' own brand colours inside the mockups, not Sellycat's palette.
 */

export type DemoDeal = {
  id: string;
  title: { de: string; en: string };
  partner: string;
  priceCents: number;
  valueCents: number;
  left: number;
  /** Unsplash photo id (images.unsplash.com/<photo>). */
  photo: string;
  /** Focal point (0–1) for the square crop and object-position, where the subject is off-centre. */
  focus?: [number, number];
  /** Two colours sampled from the photo, for tinted surfaces (wallet pass, voucher header). */
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
  { id: "radio", name: "Lumen Magazin", domain: "deals.lumen-magazin.ch", primary: "#6D3BFF", onPrimary: "#FFFFFF", surface: "#F4F0FF", ink: "#1B1033", font: "Inter, system-ui, sans-serif", radius: 18, mark: "wave" },
  { id: "city", name: "Seestadt erleben", domain: "gutscheine.seestadt.ch", primary: "#0E7C66", onPrimary: "#FFFFFF", surface: "#EEF7F4", ink: "#0B2620", font: "Georgia, 'Times New Roman', serif", radius: 6, mark: "tower" },
  { id: "club", name: "Gewerbeverein Nord", domain: "vorteile.gv-nord.ch", primary: "#F2B705", onPrimary: "#111111", surface: "#FFF9E6", ink: "#2A2200", font: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif", radius: 28, mark: "circle" },
];

export const DEMO_DEALS: DemoDeal[] = [
  { id: "brunch", title: { de: "Brunch für zwei", en: "Brunch for two" }, partner: "Café Kater", priceCents: 3900, valueCents: 6000, left: 7, photo: "photo-1623852990731-472e0d1b047f", hue: ["#F4E3C9", "#9A6B3F"] },
  { id: "alp", title: { de: "Tageskarte Bergbahn", en: "Mountain railway day pass" }, partner: "Bergbahn Falkenalp", priceCents: 4500, valueCents: 7200, left: 23, photo: "photo-1635711517978-3b0ff0a53550", focus: [0.78, 0.45], hue: ["#8EC5FC", "#2F5D8A"] },
  { id: "spa", title: { de: "Spa-Abend mit Sauna", en: "Spa evening with sauna" }, partner: "Spa Lindengarten", priceCents: 5900, valueCents: 9000, left: 12, photo: "photo-1488345979593-09db0f85545f", hue: ["#BFD9E6", "#2E5E78"] },
  { id: "kino", title: { de: "2 Kinotickets mit Popcorn", en: "2 cinema tickets with popcorn" }, partner: "Kino Aurora", priceCents: 2900, valueCents: 4400, left: 41, photo: "photo-1686069277655-98d92356d65b", hue: ["#E8806A", "#7A2A1E"] },
  { id: "velo", title: { de: "Velo-Service komplett", en: "Full bike service" }, partner: "Velowerk Nord", priceCents: 6900, valueCents: 11000, left: 5, photo: "photo-1520538254843-27a40bae5e3a", focus: [0.35, 0.5], hue: ["#EEE9E4", "#B3342B"] },
  { id: "buch", title: { de: "Büchergutschein CHF 50", en: "Book voucher CHF 50" }, partner: "Buchladen Seitenwind", priceCents: 4000, valueCents: 5000, left: 18, photo: "photo-1633099158362-17b8ba5b27db", hue: ["#E9E6E1", "#4A4F55"] },
  { id: "pizza", title: { de: "Pizza-Abend für vier", en: "Pizza night for four" }, partner: "Pizzeria Fortuna", priceCents: 4900, valueCents: 8000, left: 9, photo: "photo-1579751626657-72bc17010498", focus: [0.5, 0.6], hue: ["#F2A65A", "#3A2A20"] },
  { id: "see", title: { de: "Stand-up-Paddle 2 Stunden", en: "Stand-up paddle, 2 hours" }, partner: "Seebad Mira", priceCents: 2500, valueCents: 4000, left: 30, photo: "photo-1778209031600-7d29fbe649a9", hue: ["#9FD3C7", "#1E5A54"] },
];

export const chf = (cents: number) => `CHF ${Number.isInteger(cents / 100) ? `${cents / 100}.–` : (cents / 100).toFixed(2)}`;
export const discount = (d: DemoDeal) => Math.round((1 - d.priceCents / d.valueCents) * 100);

/** Square crop from the image CDN: one URL per photo (cached once, reused by every card). */
export const dealPhotoUrl = (deal: Pick<DemoDeal, "photo" | "focus">, size = 640) =>
  `https://images.unsplash.com/${deal.photo}?w=${size}&h=${size}&fit=crop${deal.focus ? `&crop=focalpoint&fp-x=${deal.focus[0]}&fp-y=${deal.focus[1]}` : ""}&q=70&auto=format`;

/** The deal's photo, filling its box (object-cover around the focal point). Decorative: the card names the deal. */
export function DealArt({ deal, className = "" }: { deal: Pick<DemoDeal, "id" | "photo" | "focus">; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed CDN size, shared by every card; next/image would multiply the variants
    <img
      src={dealPhotoUrl(deal)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`block h-full w-full object-cover ${className}`}
      style={deal.focus ? { objectPosition: `${deal.focus[0] * 100}% ${deal.focus[1] * 100}%` } : undefined}
    />
  );
}

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
