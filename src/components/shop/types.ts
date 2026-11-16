import type { JSONContent } from "@tiptap/core";
import type { RedeemWindow } from "@/lib/shop/deal-status";

/** Plain deal data as the shop renders it (from the DB or from the editor's live form state). */
export type DealView = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: JSONContent | null;
  descriptionHtml?: string;
  terms: string | null;
  faq: Array<{ q: string; a: string }>;
  deal_type: "fixed" | "value";
  price_cents: number;
  compare_at_cents: number | null;
  value_cents: number | null;
  state: "draft" | "published" | "ended";
  sales_start: string | null;
  sales_end: string | null;
  total_qty: number | null;
  sold_qty: number;
  reserved_qty: number;
  max_per_order: number | null;
  redeem_validity: "none" | "until_date" | "days_after_purchase";
  redeem_until: string | null;
  redeem_days: number | null;
  redeem_windows: RedeemWindow[];
  show_remaining: boolean;
  show_countdown: boolean;
  show_stock_bar: boolean;
  featured: boolean;
  images: Array<{ url: string; alt: string | null; width?: number | null; height?: number | null }>;
  partner: { name: string; logo_url: string | null; website_url: string | null } | null;
  category: { name: string; slug: string } | null;
  locations: Array<{ id: string; name: string; street: string | null; zip: string | null; city: string | null; lat: number | null; lng: number | null; opening_hours: string | null }>;
};

export type ShopInfo = { name: string; currency: string; locale: "de" | "en" };
