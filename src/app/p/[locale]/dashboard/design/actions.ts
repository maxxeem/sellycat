"use server";

import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { importBranding, type ImportResult } from "@/lib/design/brand-import";
import { themeSchema, type ShopTheme } from "@/lib/shop/theme";
import { createRateLimiter } from "@/lib/rate-limit";
import { designToRow, parseDesign, type VoucherDesign } from "@/lib/vouchers/design";

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

const importLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export async function importFromWebsite(url: string): Promise<ImportResult> {
  const { tenant } = await requireTenant("editor");
  if (!importLimit.check(tenant.id).ok || url.length > 300) return { ok: false, reason: "unreachable" };
  try {
    return await importBranding(url);
  } catch {
    return { ok: false, reason: "unreachable" };
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
