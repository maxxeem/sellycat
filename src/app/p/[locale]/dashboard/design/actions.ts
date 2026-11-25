"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { brandingFromLogo, importBranding, type ImportResult } from "@/lib/design/brand-import";
import { themeSchema, type ShopTheme } from "@/lib/shop/theme";
import { rateLimit } from "@/lib/access/server";
import { designToRow, parseDesign, type VoucherDesign } from "@/lib/vouchers/design";
import { parseWalletDesign, type WalletDesign } from "@/lib/wallet/content";

export async function saveTheme(theme: ShopTheme, publish: boolean): Promise<{ ok: boolean; error?: string }> {
  const { tenant, supabase } = await requireTenant("editor");
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.path.join(".") };
  const row = publish
    ? { tenant_id: tenant.id, draft: parsed.data, published: parsed.data, published_at: new Date().toISOString() }
    : { tenant_id: tenant.id, draft: parsed.data };
  const { error } = await supabase.from("shop_themes").upsert(row as never, { onConflict: "tenant_id" });
  if (error) return { ok: false, error: error.message };
  if (publish) refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/design", "page");
  return { ok: true };
}


/**
 * Suggestion from the customer's website. Logo and icon are copied into the shop's own storage
 * right away, so the preview and later the shop never load them from the customer's site.
 */
export async function importFromWebsite(url: string): Promise<ImportResult> {
  const { tenant, supabase } = await requireTenant("editor");
  if (!(await rateLimit("brand-import", tenant.id, 15, 3600)) || url.length > 300) return { ok: false, reason: "unreachable" };
  try {
    const r = await importBranding(url);
    if (!r.ok) return r;
    const store = async (file: { data: Buffer; type: string; ext: string } | undefined) => {
      if (!file) return undefined;
      const path = `${tenant.id}/theme/${randomUUID()}.${file.ext}`;
      const { error } = await supabase.storage.from("shop-media").upload(path, file.data, { contentType: file.type, cacheControl: "31536000", upsert: false });
      return error ? undefined : supabase.storage.from("shop-media").getPublicUrl(path).data.publicUrl;
    };
    const [logo, favicon] = await Promise.all([store(r.files.logo), store(r.files.favicon)]);
    const suggestion = { ...r.suggestion, logo, favicon };
    if (!logo && !favicon && !suggestion.colors.primary && !suggestion.fonts.heading) return { ok: false, reason: "nothing" };
    return { ok: true, suggestion, partial: r.partial };
  } catch (e) {
    console.error("[branding import]", e instanceof Error ? e.message : e);
    return { ok: false, reason: "unreachable" };
  }
}

/** Colours read from the shop's uploaded logo (only pictures in the shop's own storage folder). */
export async function colorsFromLogo(logoUrl: string): Promise<ImportResult> {
  const { tenant, supabase } = await requireTenant("editor");
  const own = supabase.storage.from("shop-media").getPublicUrl(`${tenant.id}/`).data.publicUrl;
  if (!logoUrl.startsWith(own) || !(await rateLimit("brand-import", tenant.id, 15, 3600))) return { ok: false, reason: "nothing" };
  try {
    const suggestion = await brandingFromLogo(logoUrl);
    return suggestion ? { ok: true, suggestion, partial: false } : { ok: false, reason: "nothing" };
  } catch {
    return { ok: false, reason: "nothing" };
  }
}

/** Voucher PDF design of the shop (editor and up). */
export async function saveVoucherDesign(input: VoucherDesign): Promise<{ ok: boolean }> {
  const { tenant, supabase } = await requireTenant("editor");
  const design = parseDesign(input);
  const { error } = await supabase.from("voucher_designs").upsert({ tenant_id: tenant.id, ...designToRow(design) }, { onConflict: "tenant_id" });
  revalidatePath("/p/[locale]/dashboard/design/voucher", "page");
  return { ok: !error };
}

/** Wallet pass design of the shop (editor and up); passes on phones update with the next change. */
export async function saveWalletDesign(input: WalletDesign): Promise<{ ok: boolean }> {
  const { tenant, supabase } = await requireTenant("editor");
  const d = parseWalletDesign(input);
  const { error } = await supabase
    .from("wallet_designs")
    .upsert({ tenant_id: tenant.id, background: d.background, foreground: d.foreground, label: d.label, show_image: d.showImage, show_locations: d.showLocations }, { onConflict: "tenant_id" });
  revalidatePath("/p/[locale]/dashboard/design/wallet", "page");
  return { ok: !error };
}
