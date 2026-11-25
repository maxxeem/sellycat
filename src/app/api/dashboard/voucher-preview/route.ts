import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { getShopProfile } from "@/lib/shop/queries";
import { createClient } from "@/lib/supabase/server";
import { lightLogo, loadDesign } from "@/lib/vouchers/data";
import { dealAd, parseDesign } from "@/lib/vouchers/design";
import { renderVoucherPdf, type PdfVoucher } from "@/lib/vouchers/pdf";
import { checkUrl } from "@/lib/vouchers/symbol";

/**
 * Live preview of the voucher PDF for the design editor (editor and up): the design comes from
 * the query string, the content from the shop's newest deal with a sample code.
 */
export async function GET(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant || !roleAtLeast(tenant.role, "editor")) return new Response("Not found", { status: 404 });
  const [shop, supabase] = await Promise.all([getShopProfile(tenant.id), createClient()]);
  if (!shop) return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  // From the deal editor: this deal with the saved design and the advertising chosen there.
  const dealId = /^[0-9a-f-]{36}$/.test(params.get("deal") ?? "") ? params.get("deal") : null;
  const design = dealId ? await loadDesign(tenant.id) : parseDesign(Object.fromEntries(params));
  const t = shop.locale;

  let query = supabase
    .from("deals")
    .select("title, subtitle, terms, deal_type, value_cents, code_format, barcode_type, redeem_validity, redeem_until, redeem_days, partners(name), deal_images(url, sort_order), deal_locations(partner_locations(name, street, zip, city))")
    .eq("tenant_id", tenant.id);
  query = dealId ? query.eq("id", dealId) : query.order("state", { ascending: false }).order("updated_at", { ascending: false });
  const { data: deal } = await query.limit(1).maybeSingle();

  const host = shop.primaryHost ?? "example.sellycat.com";
  const sampleCode = deal?.code_format === "numeric" ? "4821 0937 5512" : deal?.code_format === "barcode" ? "2001234567893" : "K7MQ-4XPA-92HD";
  const validUntil =
    deal?.redeem_validity === "until_date" && deal.redeem_until
      ? `${deal.redeem_until}T22:00:00Z`
      : deal?.redeem_validity === "days_after_purchase" && deal.redeem_days
        ? new Date(Date.now() + deal.redeem_days * 86_400_000).toISOString()
        : null;
  const voucher: PdfVoucher = {
    title: deal?.title ?? (t === "de" ? "2 Pizzas nach Wahl" : "2 pizzas of your choice"),
    subtitle: deal?.subtitle ?? null,
    partner: deal?.partners?.name ?? null,
    code: sampleCode,
    codeFormat: deal?.code_format ?? "qr",
    barcodeType: deal?.code_format === "barcode" ? (deal.barcode_type ?? "ean13") : null,
    link: checkUrl(host, "PreviewToken0000000000000"),
    status: "valid",
    valueCents: deal?.deal_type === "value" ? deal.value_cents : null,
    remainingCents: deal?.deal_type === "value" ? deal.value_cents : null,
    currency: shop.currency,
    validUntil,
    terms: deal?.terms ?? null,
    ad: dealId ? dealAd(params.get("adMode"), parseDesign({ adImage: params.get("adImage") }).adImage) : undefined,
    image: [...(deal?.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
    locations: (deal?.deal_locations ?? []).map((l) => l.partner_locations).filter((l): l is NonNullable<typeof l> => Boolean(l)),
  };

  const pdf = await renderVoucherPdf({
    shopName: shop.name,
    locale: shop.locale,
    primary: shop.theme.colors.primary,
    logoUrl: lightLogo(shop),
    host,
    orderNumber: "AB12-CD34",
    gift: null,
    vouchers: [voucher],
    design,
  });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="preview.pdf"', "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
