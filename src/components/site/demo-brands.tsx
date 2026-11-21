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
  { id: "kino", title: { de: "2 Kinotickets mit Popcorn", en: "2 cinema tickets with popcorn" }, partner: "Kino Aurora", priceCents: 2900, valueCents: 4400, left: 41, photo: "photo-1702308954905-341065817003", hue: ["#E9DCC6", "#2E3E52"] },
  { id: "velo", title: { de: "Velo-Service komplett", en: "Full bike service" }, partner: "Velowerk Nord", priceCents: 6900, valueCents: 11000, left: 5, photo: "photo-1675798225739-d8919b7a23f7", hue: ["#E8EFD9", "#4A5A2A"] },
  { id: "buch", title: { de: "Büchergutschein CHF 50", en: "Book voucher CHF 50" }, partner: "Buchladen Seitenwind", priceCents: 4000, valueCents: 5000, left: 18, photo: "photo-1621347891240-e856b95ec627", hue: ["#F4EFE8", "#B5532E"] },
  { id: "pizza", title: { de: "Pizza-Abend für vier", en: "Pizza night for four" }, partner: "Pizzeria Fortuna", priceCents: 4900, valueCents: 8000, left: 9, photo: "photo-1579751626657-72bc17010498", focus: [0.5, 0.6], hue: ["#F2A65A", "#3A2A20"] },
  { id: "see", title: { de: "Stand-up-Paddle 2 Stunden", en: "Stand-up paddle, 2 hours" }, partner: "Seebad Mira", priceCents: 2500, valueCents: 4000, left: 30, photo: "photo-1778209031600-7d29fbe649a9", hue: ["#9FD3C7", "#1E5A54"] },
  { id: "wein", title: { de: "Weindegustation mit Apéro", en: "Wine tasting with apéro" }, partner: "Weingut Sonnhalde", priceCents: 3500, valueCents: 5500, left: 14, photo: "photo-1506377247377-2a5b3b417ebb", hue: ["#D9C7B8", "#5B1E2B"] },
  { id: "sushi", title: { de: "Sushi-Menü für zwei", en: "Sushi menu for two" }, partner: "Sora Sushi", priceCents: 5900, valueCents: 8800, left: 8, photo: "photo-1607301405418-780ee5e6dd10", hue: ["#F2C3A0", "#1C1C1C"] },
  { id: "yoga", title: { de: "10er-Abo Yoga", en: "Yoga 10-class pass" }, partner: "Studio Atem", priceCents: 15900, valueCents: 22000, left: 20, photo: "photo-1552196563-55cd4e45efb3", hue: ["#EDE6DE", "#6B5A4C"] },
  { id: "tennis", title: { de: "Tennisplatz für 2 Stunden", en: "Tennis court for 2 hours" }, partner: "Tennisclub Seeblick", priceCents: 3600, valueCents: 5000, left: 26, photo: "photo-1684443726764-6a236cb33ccb", hue: ["#7FB069", "#2E5E2A"] },
  { id: "pasta", title: { de: "Pasta-Kochkurs", en: "Pasta cooking class" }, partner: "Kochatelier Salz", priceCents: 8900, valueCents: 12900, left: 6, photo: "photo-1612966874574-e0a92ad2bc43", hue: ["#F4D58D", "#9C6B1F"] },
  { id: "konzert", title: { de: "Konzertticket Stehplatz", en: "Concert ticket, standing" }, partner: "Halle Ost", priceCents: 4900, valueCents: 6900, left: 33, photo: "photo-1470229722913-7c0e2dbbafd3", hue: ["#F3B65B", "#2B1A10"] },
  { id: "ski", title: { de: "Skipass Tageskarte", en: "Ski day pass" }, partner: "Skigebiet Weisshorn", priceCents: 5200, valueCents: 7400, left: 40, photo: "photo-1641799540167-44c4865934e9", hue: ["#EEF3F8", "#C0392B"] },
  { id: "hotel", title: { de: "Übernachtung mit Frühstück", en: "Night with breakfast" }, partner: "Hotel Lindenblick", priceCents: 14900, valueCents: 21000, left: 4, photo: "photo-1549638441-b787d2e11f14", hue: ["#F1EEE9", "#8A7E70"] },
  { id: "blumen", title: { de: "Blumenstrauss nach Saison", en: "Seasonal bouquet" }, partner: "Blumen Mohn", priceCents: 3900, valueCents: 5500, left: 11, photo: "photo-1602136303098-f5aa2b9c9df9", hue: ["#FBE7DC", "#B5576C"] },
  { id: "glace", title: { de: "Glace-Pass für 5 Kugeln", en: "Ice cream pass, 5 scoops" }, partner: "Gelateria Nuvola", priceCents: 1500, valueCents: 2250, left: 52, photo: "photo-1554843515-4a8a288effab", hue: ["#F2E4D8", "#8B2E1E"] },
  { id: "burger", title: { de: "Burger-Menü für zwei", en: "Burger menu for two" }, partner: "Grillwerk", priceCents: 3900, valueCents: 5800, left: 17, photo: "photo-1757834787931-ddd70f3379a5", hue: ["#E8B36A", "#3B2414"] },
  { id: "museum", title: { de: "Museumspass für zwei", en: "Museum pass for two" }, partner: "Kunsthaus am Fluss", priceCents: 2800, valueCents: 4000, left: 45, photo: "photo-1496889196885-5ddcec5eef4d", hue: ["#ECECEC", "#6E6E6E"] },
  { id: "cocktail", title: { de: "Cocktailkurs am Abend", en: "Evening cocktail class" }, partner: "Bar Mondschein", priceCents: 6500, valueCents: 9500, left: 9, photo: "photo-1470337458703-46ad1756a187", hue: ["#E9B872", "#2A2118"] },
  { id: "gipfeli", title: { de: "Gipfeli-Abo für einen Monat", en: "Croissant subscription, one month" }, partner: "Bäckerei Korn", priceCents: 3200, valueCents: 4500, left: 19, photo: "photo-1623334044303-241021148842", focus: [0.5, 0.45], hue: ["#E7B985", "#8A5527"] },
  { id: "golf", title: { de: "Golf-Schnupperkurs", en: "Golf taster lesson" }, partner: "Golfpark Seeland", priceCents: 7900, valueCents: 11900, left: 7, photo: "photo-1632946269126-0f8edbe8b068", focus: [0.4, 0.6], hue: ["#BFD9A8", "#2F5D2A"] },
  { id: "ballon", title: { de: "Ballonfahrt bei Sonnenaufgang", en: "Hot-air balloon at sunrise" }, partner: "Ballonteam Aare", priceCents: 24900, valueCents: 32000, left: 3, photo: "photo-1633118325558-c817f0259943", focus: [0.75, 0.4], hue: ["#D7E6F2", "#C0392B"] },
];

/** Price for the mockups: «CHF 39» or «CHF 39.50» (no dash notation anywhere on the landing). */
export const chf = (cents: number) => `CHF ${Number.isInteger(cents / 100) ? cents / 100 : (cents / 100).toFixed(2)}`;
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
