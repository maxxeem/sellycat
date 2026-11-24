import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/fmt";
import { dealStatus, formatMoney, isListed, isTeaser, remaining, savingsPercent } from "./deal-status";
import { parseHours } from "./hours";
import type { DealView } from "@/components/shop/types";

/**
 * Search and AI visibility of the shops (pure, tested): titles and descriptions generated from the
 * deal unless the shop wrote its own, and schema.org data. A teaser never reveals its price here.
 */
export type SeoTexts = Dictionary["shop"]["seo"];
export type SeoShop = { name: string; currency: string; locale: "de" | "en" };

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const has = (text: string, part: string) => text.toLowerCase().includes(part.toLowerCase());

/** Cuts at a word boundary; never longer than `max`. */
export function clip(text: string, max: number): string {
  const t = oneLine(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–-]+$/, "")}…`;
}

const sentence = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

/** The one city all locations share, if any. */
function cityOf(deal: Pick<DealView, "locations">): string | null {
  const cities = [...new Set(deal.locations.map((l) => l.city?.trim()).filter((c): c is string => Boolean(c)))];
  return cities.length === 1 ? cities[0] : null;
}

/** Generated title: deal, then city, partner and shop name as far as they fit. */
export function autoTitle(deal: DealView, shop: SeoShop, t: SeoTexts): string {
  let title = oneLine(deal.title);
  const city = cityOf(deal);
  const partner = deal.partner?.name.trim();
  for (const part of [city && !has(title, city) ? ` ${fmt(t.place, { city })}` : "", partner && partner !== shop.name && !has(title, partner) ? ` – ${partner}` : "", has(title, shop.name) ? "" : ` · ${shop.name}`]) {
    if (part && title.length + part.length <= TITLE_MAX) title += part;
  }
  return title;
}

/** Generated description: what it is, then price, saving, provider, place and end of the sale. */
export function autoDescription(deal: DealView, shop: SeoShop, t: SeoTexts, now: Date): string {
  const status = dealStatus(deal, now);
  const facts: string[] = [];
  if (isTeaser(deal, now)) facts.push(t.teaser);
  else if (status !== "ended") {
    const price = formatMoney(deal.price_cents, shop.currency, shop.locale);
    const percent = savingsPercent(deal.price_cents, deal.compare_at_cents);
    facts.push(percent ? fmt(t.priceFactSaving, { price, was: formatMoney(deal.compare_at_cents!, shop.currency, shop.locale), percent }) : fmt(t.priceFact, { price }));
    if (status === "live" && deal.sales_end) facts.push(fmt(t.until, { date: new Date(deal.sales_end).toLocaleDateString(shop.locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", timeZone: "Europe/Zurich" }) }));
  }
  const city = cityOf(deal);
  const lead = oneLine(deal.subtitle || deal.descriptionText || [deal.title, deal.partner?.name, city ? fmt(t.place, { city }) : ""].filter(Boolean).join(" "));
  const tail = facts.map(sentence).join(" ");
  const room = DESCRIPTION_MAX - (tail ? tail.length + 1 : 0);
  return [sentence(clip(lead, room - 1)), tail].filter(Boolean).join(" ");
}

export type SeoText = { title: string; description: string };

export function dealSeo(deal: DealView, shop: SeoShop, t: SeoTexts, now: Date): SeoText {
  return {
    title: oneLine(deal.seo_title ?? "") || autoTitle(deal, shop, t),
    description: oneLine(deal.seo_description ?? "") || autoDescription(deal, shop, t, now),
  };
}

const dealNames = (deals: DealView[]) => deals.slice(0, 5).map((d) => oneLine(d.title)).join(", ");
const listText = (template: string, vars: Record<string, string>, deals: DealView[]) => {
  const room = DESCRIPTION_MAX - fmt(template, { ...vars, deals: "" }).length;
  return fmt(template, { ...vars, deals: clip(dealNames(deals), Math.max(20, room)) });
};

export function homeSeo(shop: SeoShop & { settings: { seo_title?: string | null; seo_description?: string | null }; heroSubtitle?: string }, deals: DealView[], t: SeoTexts): SeoText {
  return {
    title: oneLine(shop.settings.seo_title ?? "") || fmt(t.shopTitle, { shop: shop.name }),
    description:
      oneLine(shop.settings.seo_description ?? "") ||
      (deals.length ? listText(t.shopDescription, { shop: shop.name }, deals) : clip(shop.heroSubtitle || fmt(t.shopDescriptionEmpty, { shop: shop.name }), DESCRIPTION_MAX)),
  };
}

export function categorySeo(category: string, shop: SeoShop, deals: DealView[], t: SeoTexts): SeoText {
  return {
    title: fmt(t.categoryTitle, { category, shop: shop.name }),
    description: listText(t.categoryDescription, { category, shop: shop.name }, deals),
  };
}

/** Deals that belong into search results, sitemap and llms.txt. */
export const indexableDeals = (deals: DealView[], now: Date) => deals.filter((d) => isListed(d, now) && !d.seo_noindex);
export const dealIndexable = (deal: DealView, now: Date) => isListed(deal, now) && !deal.seo_noindex;

/** Absolute base of a shop ("" while it has no host); http with the dev port on localhost. */
export function shopBase(host: string | null, devHost = ""): string {
  if (!host) return "";
  if (!host.endsWith(".localhost")) return `https://${host}`;
  const port = /:\d+$/.exec(devHost)?.[0] ?? "";
  return `http://${host}${port}`;
}

/* ---------- schema.org ---------- */

type Json = Record<string, unknown>;
export type ShopSchemaInput = SeoShop & { base: string; logo?: string | null; email?: string | null; phone?: string | null; sameAs?: string[]; description?: string };

/** The shop itself: every page references it by id. */
function shopNodes(s: ShopSchemaInput): Json[] {
  return [
    {
      "@type": "OnlineStore",
      "@id": `${s.base}/#shop`,
      name: s.name,
      url: `${s.base}/`,
      description: s.description,
      logo: s.logo || undefined,
      email: s.email || undefined,
      telephone: s.phone || undefined,
      sameAs: s.sameAs?.length ? s.sameAs : undefined,
    },
    { "@type": "WebSite", "@id": `${s.base}/#website`, url: `${s.base}/`, name: s.name, inLanguage: s.locale === "de" ? "de-CH" : "en", publisher: { "@id": `${s.base}/#shop` } },
  ];
}

const breadcrumbs = (items: Array<{ name: string; url: string }>): Json => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((i, n) => ({ "@type": "ListItem", position: n + 1, name: i.name, item: i.url })),
});

export function listSchema(s: ShopSchemaInput, deals: DealView[], category?: { name: string; slug: string } | null): Json {
  const url = category ? `${s.base}/k/${category.slug}` : `${s.base}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...shopNodes(s),
      ...(category ? [breadcrumbs([{ name: s.name, url: `${s.base}/` }, { name: category.name, url }])] : []),
      ...(deals.length
        ? [{ "@type": "ItemList", url, numberOfItems: deals.length, itemListElement: deals.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${s.base}/d/${d.slug}`, name: d.title })) }]
        : []),
    ],
  };
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function placeNode(l: DealView["locations"][number]): Json {
  const hours = parseHours(l.hours);
  const specs = hours
    ? Object.entries(hours).flatMap(([day, ranges]) => ranges.map((r) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${WEEKDAYS[Number(day) - 1]}`, opens: r.from, closes: r.to })))
    : [];
  return {
    "@type": "Place",
    name: l.name,
    address: l.street || l.city ? { "@type": "PostalAddress", streetAddress: l.street ?? undefined, postalCode: l.zip ?? undefined, addressLocality: l.city ?? undefined } : undefined,
    geo: l.lat !== null && l.lng !== null ? { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } : undefined,
    openingHoursSpecification: specs.length ? specs : undefined,
  };
}

export function dealSchema(deal: DealView, s: ShopSchemaInput, text: SeoText, now: Date): Json {
  const url = `${s.base}/d/${deal.slug}`;
  const status = dealStatus(deal, now);
  const left = remaining(deal);
  const teaser = isTeaser(deal, now);
  const money = (c: number) => (c / 100).toFixed(2);
  const offer: Json | undefined = teaser
    ? undefined
    : {
        "@type": "Offer",
        url,
        priceCurrency: s.currency,
        price: money(deal.price_cents),
        // The regular price, shown crossed out by search engines.
        priceSpecification: deal.compare_at_cents && deal.compare_at_cents > deal.price_cents
          ? { "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: money(deal.compare_at_cents), priceCurrency: s.currency }
          : undefined,
        availability: `https://schema.org/${status === "live" ? "InStock" : status === "sold_out" ? "SoldOut" : status === "scheduled" ? "PreOrder" : "Discontinued"}`,
        availabilityStarts: deal.sales_start ?? undefined,
        availabilityEnds: deal.sales_end ?? undefined,
        priceValidUntil: deal.sales_end?.slice(0, 10),
        // Only what the page shows too.
        inventoryLevel: deal.show_remaining && left !== null ? { "@type": "QuantitativeValue", value: left } : undefined,
        availableAtOrFrom: deal.locations.length ? deal.locations.map(placeNode) : undefined,
        seller: { "@id": `${s.base}/#shop` },
      };
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...shopNodes(s),
      breadcrumbs([
        { name: s.name, url: `${s.base}/` },
        ...(deal.category ? [{ name: deal.category.name, url: `${s.base}/k/${deal.category.slug}` }] : []),
        { name: deal.title, url },
      ]),
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: deal.title,
        url,
        sku: deal.slug,
        description: deal.descriptionText || text.description,
        image: deal.images.length ? deal.images.map((i) => i.url) : undefined,
        category: deal.category?.name,
        brand: deal.partner ? { "@type": "Brand", name: deal.partner.name } : { "@type": "Brand", name: s.name },
        offers: offer,
      },
      ...(deal.faq.length ? [{ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: deal.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
    ],
  };
}

/** For a <script type="application/ld+json">: no `<` can close the tag. */
export const jsonLd = (data: Json) => JSON.stringify(data).replace(/</g, "\\u003c");

/* ---------- llms.txt ---------- */

const md = (s: string) => oneLine(s).replace(/[[\]]/g, "");

/** llms.txt of a shop: what it is and every current deal, for AI assistants. */
export function llmsText(s: ShopSchemaInput & { description: string }, deals: DealView[], categories: Array<{ name: string; slug: string }>, info: Array<{ name: string; path: string }>, t: SeoTexts, now: Date): string {
  const line = (d: DealView) => {
    const places = [...new Set(d.locations.map((l) => [l.name, l.city].filter(Boolean).join(", ")))].slice(0, 5);
    const facts = [autoDescription(d, s, t, now), d.partner ? `${t.partnerLabel}: ${md(d.partner.name)}.` : "", places.length ? `${t.placeLabel}: ${md(places.join("; "))}.` : ""].filter(Boolean).join(" ");
    return `- [${md(d.title)}](${s.base}/d/${d.slug}): ${oneLine(d.seo_description ?? "") ? `${oneLine(d.seo_description!)} ` : ""}${facts}`;
  };
  return [
    `# ${md(s.name)}`,
    "",
    `> ${oneLine(s.description)}`,
    "",
    `${t.llmsShop}: ${s.base}/`,
    ...(deals.length ? ["", `## ${t.llmsDeals}`, "", ...deals.map(line)] : []),
    ...(categories.length ? ["", `## ${t.llmsCategories}`, "", ...categories.map((c) => `- [${md(c.name)}](${s.base}/k/${c.slug})`)] : []),
    ...(info.length ? ["", `## ${t.llmsInfo}`, "", ...info.map((i) => `- [${md(i.name)}](${s.base}${i.path})`)] : []),
    "",
  ].join("\n");
}
