import "server-only";
import { getShopProfile, type ShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PdfInput, PdfVoucher } from "./pdf";
import { checkUrl, type BarcodeType, type CodeFormat } from "./symbol";

/**
 * Everything the PDF and the mails need about a set of vouchers (service role; callers check
 * access first: a Stripe session id, a voucher token, a sign-in link or a dashboard role).
 */
const SELECT =
  "id, title, code, code_format, barcode_type, status, valid_until, value_cents, remaining_cents, token, order_id, partners(name), deals(subtitle, terms, deal_images(url, sort_order), deal_locations(partner_locations(name, street, zip, city))), orders(number, currency, gift, gift_from, gift_message)";

export type LoadedVoucher = PdfVoucher & { id: string; token: string; orderId: string };
export type VoucherBundle = { shop: ShopProfile; host: string; vouchers: LoadedVoucher[]; order: { number: string; gift: { from: string | null; message: string | null } | null } | null };

type Row = {
  id: string;
  title: string;
  code: string;
  code_format: CodeFormat;
  barcode_type: BarcodeType | null;
  status: PdfVoucher["status"];
  valid_until: string | null;
  value_cents: number | null;
  remaining_cents: number | null;
  token: string;
  order_id: string;
  partners: { name: string } | null;
  deals: {
    subtitle: string | null;
    terms: string | null;
    deal_images: Array<{ url: string; sort_order: number }> | null;
    deal_locations: Array<{ partner_locations: { name: string; street: string | null; zip: string | null; city: string | null } | null }> | null;
  } | null;
  orders: { number: string; currency: string; gift: boolean; gift_from: string | null; gift_message: string | null } | null;
};

export async function loadVouchers(tenantId: string, by: { orderId: string } | { token: string } | { orderIds: string[] }, fallbackHost: string): Promise<VoucherBundle | null> {
  const shop = await getShopProfile(tenantId);
  if (!shop) return null;
  let query = createAdminClient().from("vouchers").select(SELECT).eq("tenant_id", tenantId).order("created_at").limit(200);
  if ("orderId" in by) query = query.eq("order_id", by.orderId);
  else if ("token" in by) query = query.eq("token", by.token);
  else query = query.in("order_id", by.orderIds.length ? by.orderIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return null;
  const host = shop.primaryHost ?? fallbackHost;
  const first = rows[0].orders;
  return {
    shop,
    host,
    order: "orderId" in by && first ? { number: first.number, gift: first.gift ? { from: first.gift_from, message: first.gift_message } : null } : null,
    vouchers: rows.map((r) => ({
      id: r.id,
      token: r.token,
      orderId: r.order_id,
      title: r.title,
      subtitle: r.deals?.subtitle ?? null,
      partner: r.partners?.name ?? null,
      code: r.code,
      codeFormat: r.code_format,
      barcodeType: r.barcode_type,
      link: checkUrl(host, r.token),
      status: r.status,
      valueCents: r.value_cents,
      remainingCents: r.remaining_cents,
      currency: r.orders?.currency ?? shop.currency,
      validUntil: r.valid_until,
      terms: r.deals?.terms ?? null,
      image: [...(r.deals?.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
      locations: (r.deals?.deal_locations ?? []).map((l) => l.partner_locations).filter((l): l is NonNullable<typeof l> => Boolean(l)),
    })),
  };
}

/** Logo for a white page or mail: the one made for light backgrounds first. */
export const lightLogo = (shop: ShopProfile) => shop.theme.logoLight || shop.theme.logoDark || null;

export function pdfInput(b: VoucherBundle, gift: PdfInput["gift"] = b.order?.gift ?? null): PdfInput {
  return {
    shopName: b.shop.name,
    locale: b.shop.locale,
    primary: b.shop.theme.colors.primary,
    logoUrl: lightLogo(b.shop),
    host: b.host,
    orderNumber: b.order?.number ?? null,
    gift,
    vouchers: b.vouchers,
  };
}

/** File name for the download / attachment. */
export const pdfName = (b: VoucherBundle) => `${b.shop.slug}-${b.order?.number ?? b.vouchers[0]?.code ?? "voucher"}.pdf`.replace(/[^\w.-]+/g, "-");
