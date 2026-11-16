/**
 * Staging seed (idempotent, refuses production): a staff super-admin and two demo customers with
 * different languages. Deals, partners and branding follow in phase 2 (same script, extended).
 *
 *   SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run seed:staging
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const root = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://staging.sellycat.com").hostname;

if (!url || !secret || !email || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
  process.exit(2);
}
if (process.env.SUPABASE_PRODUCTION_REF && url.includes(process.env.SUPABASE_PRODUCTION_REF)) {
  console.error("Refusing to seed production.");
  process.exit(2);
}

const db = createClient<Database>(url, secret, { auth: { persistSession: false } });

async function ensureUser(mail: string, pw: string): Promise<string> {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = data.users.find((u) => u.email?.toLowerCase() === mail.toLowerCase());
  if (existing) return existing.id;
  const { data: created, error } = await db.auth.admin.createUser({ email: mail, password: pw, email_confirm: true, user_metadata: { full_name: "Sellycat Admin" } });
  if (error || !created.user) throw error;
  return created.user.id;
}

async function ensureTenant(slug: string, name: string, locale: "de" | "en", ownerId: string) {
  const { data: found } = await db.from("tenants").select("id").eq("slug", slug).maybeSingle();
  const id = found?.id ?? (await db.from("tenants").insert({ name, slug, locale, status: "active", plan_id: "pro" }).select("id").single()).data!.id;
  await db.from("tenant_members").upsert({ tenant_id: id, user_id: ownerId, role: "owner" }, { onConflict: "tenant_id,user_id" });
  await db.from("tenant_domains").upsert({ tenant_id: id, hostname: `${slug}.${root}`, kind: "subdomain", status: "active", is_primary: true }, { onConflict: "hostname" });
  console.log(`  ${name}: https://${slug}.${root}`);
  return id as string;
}

// ---------------------------------------------------------------- phase 2 content
const doc = (...paragraphs: string[]) => ({ type: "doc", content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })) });
const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/800`;
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

type SeedDeal = Record<string, unknown> & { slug: string; images?: string[]; locations?: string[] };

async function seedShop(tenantId: string, content: {
  theme: Record<string, unknown>;
  legal: { imprint: string; terms: string; privacy: string };
  settings: Record<string, unknown>;
  categories: Array<{ name: string; slug: string }>;
  partners: Array<{ name: string; description: string; website_url?: string; locations: Array<{ name: string; street: string; zip: string; city: string; lat: number; lng: number; opening_hours?: string }> }>;
  deals: SeedDeal[];
}) {
  await db.from("shop_themes").upsert({ tenant_id: tenantId, draft: content.theme, published: content.theme, published_at: new Date().toISOString() } as never, { onConflict: "tenant_id" });
  await db.from("legal_pages").upsert((["imprint", "terms", "privacy"] as const).map((kind) => ({ tenant_id: tenantId, kind, content: content.legal[kind] })), { onConflict: "tenant_id,kind" });
  await db.from("tenants").update({ shop_settings: content.settings as never }).eq("id", tenantId);
  for (const c of content.categories) await db.from("categories").upsert({ tenant_id: tenantId, ...c }, { onConflict: "tenant_id,slug" });
  const { data: cats } = await db.from("categories").select("id, slug").eq("tenant_id", tenantId);
  const locationIds = new Map<string, string>();
  const partnerIds = new Map<string, string>();
  for (const p of content.partners) {
    const { data: existing } = await db.from("partners").select("id").eq("tenant_id", tenantId).eq("name", p.name).maybeSingle();
    const pid = existing?.id ?? (await db.from("partners").insert({ tenant_id: tenantId, name: p.name, description: p.description, website_url: p.website_url ?? null }).select("id").single()).data!.id;
    partnerIds.set(p.name, pid);
    for (const l of p.locations) {
      const { data: loc } = await db.from("partner_locations").select("id").eq("partner_id", pid).eq("name", l.name).maybeSingle();
      const lid = loc?.id ?? (await db.from("partner_locations").insert({ tenant_id: tenantId, partner_id: pid, country: "CH", ...l }).select("id").single()).data!.id;
      locationIds.set(l.name, lid);
    }
  }
  for (const [i, d] of content.deals.entries()) {
    const { images = [], locations = [], partner, category, ...row } = d as SeedDeal & { partner?: string; category?: string };
    const values = { tenant_id: tenantId, sort_order: i, partner_id: partner ? partnerIds.get(partner) : null, category_id: cats?.find((c) => c.slug === category)?.id ?? null, ...row };
    const { data: existing } = await db.from("deals").select("id").eq("tenant_id", tenantId).eq("slug", d.slug).maybeSingle();
    const dealId = existing?.id ?? (await db.from("deals").insert(values as never).select("id").single()).data?.id;
    if (!dealId) {
      console.error("  deal failed:", d.slug);
      continue;
    }
    if (existing) await db.from("deals").update(values as never).eq("id", dealId);
    await db.from("deal_images").delete().eq("deal_id", dealId);
    if (images.length) await db.from("deal_images").insert(images.map((url, n) => ({ tenant_id: tenantId, deal_id: dealId, url, sort_order: n })));
    await db.from("deal_locations").delete().eq("deal_id", dealId);
    if (locations.length) await db.from("deal_locations").insert(locations.map((name) => ({ tenant_id: tenantId, deal_id: dealId, location_id: locationIds.get(name)! })));
  }
  console.log(`    ${content.deals.length} deals, ${content.partners.length} partners`);
}

const LEGAL_DE = {
  imprint: "Pizzeria Demo GmbH\nBahnhofstrasse 1\n8001 Zürich\nSchweiz\n\nE-Mail: hallo@pizzeria-demo.ch\nUID: CHE-000.000.000\n\nDies ist ein Demo-Shop auf der Sellycat-Testumgebung.",
  terms: "Allgemeine Geschäftsbedingungen (Demo)\n\nGutscheine sind nicht in bar auszahlbar. Für die Einlösung gelten die beim Deal angegebenen Bedingungen und Fristen.\n\nDies ist ein Mustertext für die Testumgebung.",
  privacy: "Datenschutzerklärung (Demo)\n\nWir bearbeiten deine Daten (E-Mail, Name) nur für die Abwicklung deiner Bestellung. Zahlungen laufen über Stripe.\n\nDies ist ein Mustertext für die Testumgebung.",
};
const LEGAL_EN = {
  imprint: "City Deals AG\nMarktgasse 10\n3011 Bern\nSwitzerland\n\nEmail: hello@city-deals.ch\n\nThis is a demo shop on the Sellycat test environment.",
  terms: "Terms and conditions (demo)\n\nVouchers cannot be exchanged for cash. The conditions and validity stated with each deal apply.\n\nSample text for the test environment.",
  privacy: "Privacy policy (demo)\n\nWe process your data (email, name) only to fulfil your order. Payments are handled by Stripe.\n\nSample text for the test environment.",
};

const adminId = await ensureUser(email, password);
await db.from("platform_staff").upsert({ user_id: adminId, role: "superadmin" }, { onConflict: "user_id" });
console.log(`Staff super-admin: ${email}`);
const pizzeria = await ensureTenant("pizzeria-demo", "Pizzeria Demo", "de", adminId);
const city = await ensureTenant("city-deals", "City Deals", "en", adminId);

await seedShop(pizzeria, {
  theme: {
    colors: { primary: "#c8102e", accent: "#1b5e20", background: "#fffaf3", surface: "#f6eee2", text: "#2b1d14", success: "#1b5e20", warning: "#a15c00" },
    fonts: { heading: { source: "google", family: "Playfair Display", url: "" }, body: { source: "google", family: "Lato", url: "" } },
    radius: 6, buttonStyle: "solid", cardStyle: "bordered", listLayout: "featured", mode: "light",
    hero: { enabled: true, title: "Pizza-Deals aus Zürich", subtitle: "Holzofen, frischer Teig, faire Preise. Gutschein kaufen, aufs Handy laden, geniessen.", image: img("pizza-hero") },
    footerLinks: [{ label: "Website", url: "https://example.com" }],
  },
  legal: LEGAL_DE,
  settings: { contact_email: "hallo@pizzeria-demo.ch", contact_phone: "+41 44 000 00 00", seo_description: "Pizza-Gutscheine der Pizzeria Demo in Zürich." },
  categories: [{ name: "Pizza", slug: "pizza" }, { name: "Gutscheine", slug: "gutscheine" }, { name: "Kurse", slug: "kurse" }],
  partners: [
    { name: "Pizzeria Demo", description: "Holzofenpizza seit 1998.", website_url: "https://example.com", locations: [
      { name: "Pizzeria Demo Kreis 1", street: "Bahnhofstrasse 1", zip: "8001", city: "Zürich", lat: 47.3717, lng: 8.5394, opening_hours: "Mo–Sa 11:00–23:00" },
      { name: "Pizzeria Demo Oerlikon", street: "Schaffhauserstrasse 350", zip: "8050", city: "Zürich", lat: 47.4113, lng: 8.5446, opening_hours: "Täglich 11:30–22:30" },
    ] },
  ],
  deals: [
    { slug: "2-pizzas", title: "2 Pizzas nach Wahl", subtitle: "Für CHF 20 statt 40 – in beiden Filialen", partner: "Pizzeria Demo", category: "pizza", state: "published", deal_type: "fixed", price_cents: 2000, compare_at_cents: 4000,
      description: doc("Zwei Pizzas nach Wahl aus der ganzen Karte, frisch aus dem Holzofen.", "Einfach den Gutschein an der Kasse zeigen."), terms: "Nicht kumulierbar mit anderen Aktionen. Gilt nicht für Hauslieferung.",
      faq: [{ q: "Kann ich den Gutschein verschenken?", a: "Ja, beim Kauf kannst du einen Empfänger angeben." }], total_qty: 200, max_per_order: 4, max_per_buyer: 6, sales_end: days(21),
      redeem_validity: "days_after_purchase", redeem_days: 90, redeem_windows: [{ days: [1, 2, 3, 4, 5], from: "11:00", to: "14:00" }, { days: [1, 2, 3, 4, 5, 6, 7], from: "17:00", to: "22:00" }],
      show_remaining: true, show_countdown: true, show_stock_bar: true, featured: true, code_format: "qr", images: [img("pizza-1"), img("pizza-2"), img("pizza-3")], locations: ["Pizzeria Demo Kreis 1", "Pizzeria Demo Oerlikon"] },
    { slug: "wertgutschein-50", title: "Wertgutschein CHF 50", subtitle: "Zahle 40, geniesse für 50", partner: "Pizzeria Demo", category: "gutscheine", state: "published", deal_type: "value", price_cents: 4000, value_cents: 5000, partial_redemption: true,
      description: doc("Ein Gutschein über CHF 50, einlösbar in mehreren Besuchen."), redeem_validity: "until_date", redeem_until: days(365).slice(0, 10), code_format: "numeric", images: [img("voucher-1")], locations: ["Pizzeria Demo Kreis 1"] },
    { slug: "pizzakurs", title: "Pizzakurs für 2 Personen", subtitle: "3 Stunden mit unserem Pizzaiolo", partner: "Pizzeria Demo", category: "kurse", state: "published", deal_type: "fixed", price_cents: 12900, compare_at_cents: 16000,
      description: doc("Lerne Teig, Sauce und den perfekten Holzofen-Moment."), total_qty: 12, max_per_order: 1, show_remaining: true, show_countdown: true, sales_start: days(3), code_format: "barcode", barcode_type: "code128", images: [img("course-1")], locations: ["Pizzeria Demo Kreis 1"] },
    { slug: "tiramisu", title: "Tiramisu zum Mitnehmen", partner: "Pizzeria Demo", state: "draft", deal_type: "fixed", price_cents: 690, code_format: "qr" },
  ],
});

await seedShop(city, {
  theme: {
    colors: { primary: "#4f46e5", accent: "#0ea5e9", background: "#0b1020", surface: "#151b2e", text: "#f5f7ff", success: "#22c55e", warning: "#f59e0b" },
    fonts: { heading: { source: "google", family: "Space Grotesk", url: "" }, body: { source: "google", family: "Inter", url: "" } },
    radius: 18, buttonStyle: "pill", cardStyle: "elevated", listLayout: "grid", mode: "dark",
    hero: { enabled: true, title: "The best of Bern, for less", subtitle: "Curated deals from local partners. Instant vouchers in your wallet.", image: "" },
  },
  legal: LEGAL_EN,
  settings: { contact_email: "hello@city-deals.ch", seo_description: "Local deals in Bern." },
  categories: [{ name: "Leisure", slug: "leisure" }, { name: "Food", slug: "food" }],
  partners: [
    { name: "Aare Adventure Park", description: "Climbing and zip lines by the river.", locations: [{ name: "Aare Adventure Park", street: "Dalmaziquai 1", zip: "3005", city: "Bern", lat: 46.9419, lng: 7.4507, opening_hours: "Apr–Oct, daily 10:00–18:00" }] },
    { name: "Café Zytglogge", description: "Specialty coffee in the old town.", locations: [{ name: "Café Zytglogge", street: "Kramgasse 49", zip: "3011", city: "Bern", lat: 46.948, lng: 7.4474 }] },
  ],
  deals: [
    { slug: "day-pass", title: "Adventure park day pass", subtitle: "All courses, all day", partner: "Aare Adventure Park", category: "leisure", state: "published", deal_type: "fixed", price_cents: 3900, compare_at_cents: 5900,
      description: doc("Unlimited climbing on all eight courses."), total_qty: 500, sales_end: days(45), show_countdown: true, show_stock_bar: true, redeem_validity: "until_date", redeem_until: days(200).slice(0, 10),
      code_format: "barcode", barcode_type: "ean13", images: [img("park-1"), img("park-2")], locations: ["Aare Adventure Park"] },
    { slug: "coffee-card", title: "10 coffees card", subtitle: "Pay 8, drink 10", partner: "Café Zytglogge", category: "food", state: "published", deal_type: "fixed", price_cents: 3600, compare_at_cents: 4500,
      description: doc("Ten coffees of your choice, any size."), redeem_validity: "days_after_purchase", redeem_days: 180, code_format: "qr", images: [img("coffee-1")], locations: ["Café Zytglogge"] },
    { slug: "sold-out-brunch", title: "Sunday brunch for two", partner: "Café Zytglogge", category: "food", state: "published", deal_type: "fixed", price_cents: 5900, total_qty: 0, code_format: "qr", images: [img("brunch-1")], locations: ["Café Zytglogge"] },
  ],
});
console.log("Seed done.");
