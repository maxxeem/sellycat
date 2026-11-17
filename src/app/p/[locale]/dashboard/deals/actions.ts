"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { dealRow, validateDeal, type DealErrors, type DealForm } from "@/lib/shop/deal-input";
import { EMPTY_DOC } from "@/lib/shop/rich-text";
import { POOL_MAX_CODE, POOL_MAX_IMPORT } from "@/lib/vouchers/pool";
import { randomUUID } from "node:crypto";
import type { JSONContent } from "@tiptap/core";
import sharp from "sharp";
import { aiImportConfigured, importFromPage, type ImportError } from "@/lib/deals/import-ai";
import { blocksToDoc } from "@/lib/deals/import-parse";
import { createRateLimiter } from "@/lib/rate-limit";

export type SaveResult = { ok: boolean; errors?: DealErrors; message?: "legalMissing" | "error" };

export async function createDeal(title: string) {
  const { tenant, supabase } = await requireTenant("editor");
  const slug = `deal-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from("deals")
    .insert({ tenant_id: tenant.id, title: title || "Deal", slug, price_cents: 0, description: EMPTY_DOC as never })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  redirect(`/dashboard/deals/${data.id}`);
}

export async function saveDeal(id: string, form: DealForm): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("editor");
  const errors = validateDeal(form);
  if (Object.keys(errors).length) return { ok: false, errors };
  const { error } = await supabase.from("deals").update(dealRow(form)).eq("id", id).eq("tenant_id", tenant.id);
  if (error) {
    if (error.code === "23505") return { ok: false, errors: { slug: "slugTaken" } };
    return { ok: false, message: "error" };
  }
  // Images and locations are replaced as a whole (small lists, order matters).
  await supabase.from("deal_images").delete().eq("deal_id", id).eq("tenant_id", tenant.id);
  if (form.images.length) {
    await supabase.from("deal_images").insert(form.images.slice(0, 12).map((img, i) => ({ tenant_id: tenant.id, deal_id: id, url: img.url, alt: img.alt || null, sort_order: i })));
  }
  await supabase.from("deal_locations").delete().eq("deal_id", id).eq("tenant_id", tenant.id);
  if (form.locationIds.length) {
    await supabase.from("deal_locations").insert(form.locationIds.map((location_id) => ({ tenant_id: tenant.id, deal_id: id, location_id })));
  }
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true };
}

export async function setDealState(id: string, state: "draft" | "published" | "ended", form?: DealForm): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("editor");
  if (form) {
    const saved = await saveDeal(id, form);
    if (!saved.ok) return saved;
  }
  const { error } = await supabase.from("deals").update({ state }).eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { ok: false, message: error.message.includes("legal pages missing") ? "legalMissing" : "error" };
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true };
}

export async function deleteDeal(id: string) {
  const { tenant, supabase } = await requireTenant("admin");
  // Only drafts can disappear; published deals are ended instead (orders will point at them).
  await supabase.from("deals").delete().eq("id", id).eq("tenant_id", tenant.id).eq("state", "draft");
  refreshShop(tenant.id);
  redirect("/dashboard/deals");
}

export type PoolResult = { ok: true; added?: number; skipped?: number; removed?: number } | { ok: false; error: "tooMany" | "failed" };

/** Adds codes to the deal's pool (the database skips blanks, duplicates and codes in use). */
export async function importPoolCodes(dealId: string, codes: string[]): Promise<PoolResult> {
  const { tenant, supabase } = await requireTenant("editor");
  if (codes.length > POOL_MAX_IMPORT) return { ok: false, error: "tooMany" };
  const clean = codes.map((c) => String(c).trim()).filter((c) => c && c.length <= POOL_MAX_CODE);
  const { data, error } = await supabase.rpc("import_pool_codes", { p_deal: dealId, p_codes: clean });
  const r = data as { ok: boolean; added?: number; skipped?: number; error?: string } | null;
  if (error || !r?.ok) return { ok: false, error: r?.error === "too_many" ? "tooMany" : "failed" };
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true, added: r.added ?? 0, skipped: (r.skipped ?? 0) + (codes.length - clean.length) };
}

/** Deletes the codes that were not handed out yet. */
export async function clearPoolCodes(dealId: string): Promise<PoolResult> {
  const { tenant, supabase } = await requireTenant("editor");
  const { data, error } = await supabase.rpc("clear_pool_codes", { p_deal: dealId });
  const r = data as { ok: boolean; removed?: number } | null;
  if (error || !r?.ok) return { ok: false, error: "failed" };
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true, removed: r.removed ?? 0 };
}

const importLimit = createRateLimiter({ limit: 10, windowMs: 3_600_000 });

export type ImportResult =
  | { ok: true; title: string; subtitle: string; description: JSONContent; terms: string; faq: Array<{ q: string; a: string }>; images: Array<{ url: string; alt: string }>; regularPrice: number | null }
  | { ok: false; error: ImportError | "limit" | "invalid" };

/**
 * "Mit KI aus Link übernehmen": a draft from a product page; the chosen images are stored in the
 * shop's own storage. Nothing is saved to the deal: the editor shows the draft for review.
 */
export async function importDealFromUrl(url: string): Promise<ImportResult> {
  const { tenant, supabase } = await requireTenant("editor");
  let target: URL;
  try {
    target = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!aiImportConfigured()) return { ok: false, error: "not_configured" };
  if (!importLimit.check(tenant.id).ok) return { ok: false, error: "limit" };
  const { data: info } = await supabase.from("tenants").select("locale").eq("id", tenant.id).single();
  const r = await importFromPage(target.toString(), info?.locale === "en" ? "en" : "de");
  if (!r.ok) return r;
  const images: Array<{ url: string; alt: string }> = [];
  for (const img of r.draft.images) {
    try {
      const webp = await sharp(img.data, { limitInputPixels: 60_000_000 }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const path = `${tenant.id}/deals/${randomUUID()}.webp`;
      const { error } = await supabase.storage.from("shop-media").upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (!error) images.push({ url: supabase.storage.from("shop-media").getPublicUrl(path).data.publicUrl, alt: img.alt });
    } catch {
      // An image that cannot be converted is skipped.
    }
  }
  return { ok: true, title: r.draft.title, subtitle: r.draft.subtitle, description: blocksToDoc(r.draft.blocks), terms: r.draft.terms, faq: r.draft.faq, images, regularPrice: r.draft.regularPrice };
}
