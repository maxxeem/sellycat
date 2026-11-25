import "server-only";
import { getShopProfile, type ShopProfile } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUrl } from "@/lib/vouchers/symbol";
import type { WalletVoucher } from "./content";

/**
 * A sample voucher from the shop's newest deal with an image, for the design preview and test passes (sample
 * code, not redeemable: the check link leads to "voucher not found").
 */
export async function sampleVoucher(tenantId: string): Promise<{ shop: ShopProfile; host: string; voucher: WalletVoucher } | null> {
  const shop = await getShopProfile(tenantId);
  if (!shop) return null;
  const { data: deals } = await createAdminClient()
    .from("deals")
    .select("title, terms, deal_type, value_cents, code_format, barcode_type, redeem_validity, redeem_until, redeem_days, partners(name), deal_images(url, sort_order), deal_locations(partner_locations(name, street, zip, city, lat, lng))")
    .eq("tenant_id", tenantId)
    .order("state", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(30);
  // The preview should show the deal image: the first deal that has one, else simply the first.
  const deal = deals?.find((d) => d.deal_images.length > 0) ?? deals?.[0] ?? null;
  const host = shop.primaryHost ?? "example.sellycat.com";
  const validUntil =
    deal?.redeem_validity === "until_date" && deal.redeem_until
      ? `${deal.redeem_until}T22:00:00Z`
      : deal?.redeem_validity === "days_after_purchase" && deal.redeem_days
        ? new Date(Date.now() + deal.redeem_days * 86_400_000).toISOString()
        : null;
  const format = deal?.code_format ?? "qr";
  return {
    shop,
    host,
    voucher: {
      id: `00000000-0000-4000-8000-${tenantId.replace(/-/g, "").slice(0, 12)}`,
      title: deal?.title ?? (shop.locale === "de" ? "2 Pizzas nach Wahl" : "2 pizzas of your choice"),
      partner: deal?.partners?.name ?? null,
      code: format === "numeric" ? "4821 0937 5512" : format === "barcode" ? "2001234567893" : "TEST-4XPA-92HD",
      codeFormat: format,
      barcodeType: format === "barcode" ? (deal?.barcode_type ?? "ean13") : null,
      link: checkUrl(host, "SampleSampleSampleSample"),
      status: "valid",
      valueCents: deal?.deal_type === "value" ? deal.value_cents : null,
      remainingCents: deal?.deal_type === "value" ? deal.value_cents : null,
      currency: shop.currency,
      validUntil,
      terms: deal?.terms ?? null,
      image: [...(deal?.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
      locations: (deal?.deal_locations ?? []).map((l) => l.partner_locations).filter((l): l is NonNullable<typeof l> => Boolean(l)),
    },
  };
}
