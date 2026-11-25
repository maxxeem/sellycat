"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kickDealAlerts } from "@/lib/alerts/deal-alert";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { dealRow, validateDeal, type DealErrors, type DealForm } from "@/lib/shop/deal-input";
import { newForLibrary } from "@/lib/shop/faq-library";
import { EMPTY_DOC } from "@/lib/shop/rich-text";
import { POOL_MAX_CODE, POOL_MAX_IMPORT } from "@/lib/vouchers/pool";
import { symbolVector, type BarcodeType } from "@/lib/vouchers/symbol";
import { randomUUID } from "node:crypto";
import type { JSONContent } from "@tiptap/core";
import sharp from "sharp";
import { aiImportConfigured, importFromPage, type ImportError } from "@/lib/deals/import-ai";
import { blocksToDoc } from "@/lib/deals/import-parse";
import { createRateLimiter } from "@/lib/rate-limit";
import { audit, requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveResult = { ok: boolean; errors?: DealErrors; message?: "legalMissing" | "hasSales" | "planLimit" | "codesMissing" | "poolImport" | "error"; pool?: { added: number; skipped: number } };

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

/** `poolCodes`: codes typed into the pool field but not imported yet; saved along with the deal. */
export async function saveDeal(id: string, form: DealForm, poolCodes: string[] = []): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("editor");
  const errors = validateDeal(form);
  if (Object.keys(errors).length) return { ok: false, errors };
  // A shared barcode must be drawable in the chosen type.
  if (form.codeSource === "shared" && form.codeFormat === "barcode" && !symbolVector({ codeFormat: "barcode", barcodeType: form.barcodeType as BarcodeType, code: form.sharedCode.trim(), link: "" }))
    return { ok: false, errors: { sharedCode: "sharedCodeBarcode" } };
  // Codes first: a live deal may only switch to a source that has one (trigger deals_require_codes).
  if (form.codeSource === "shared") {
    const { error: codeError } = await supabase.from("deal_shared_codes").upsert({ deal_id: id, tenant_id: tenant.id, code: form.sharedCode.trim() }, { onConflict: "deal_id" });
    if (codeError) return { ok: false, message: "error" };
  }
  let pool: SaveResult["pool"];
  if (form.codeSource === "pool" && Array.isArray(poolCodes) && poolCodes.length) {
    const r = await importPoolCodes(id, poolCodes);
    if (!r.ok) return { ok: false, message: "poolImport" };
    pool = { added: r.added ?? 0, skipped: r.skipped ?? 0 };
  }
  const { error } = await supabase.from("deals").update(dealRow(form)).eq("id", id).eq("tenant_id", tenant.id);
  if (error) {
    if (error.message.includes("codes missing")) return { ok: false, message: "codesMissing", pool };
    if (error.code === "23505") return { ok: false, errors: { slug: "slugTaken" } };
    return { ok: false, message: "error" };
  }
  // Ticked questions go into the shop's FAQ library (the deal itself is saved already).
  if (form.faq.some((f) => f.keep)) {
    const { data: library } = await supabase.from("faq_library").select("question, answer").eq("tenant_id", tenant.id);
    const add = newForLibrary(form.faq, (library ?? []).map((l) => ({ q: l.question, a: l.answer })));
    if (add.length) await supabase.from("faq_library").insert(add.map((f) => ({ tenant_id: tenant.id, question: f.q, answer: f.a })));
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
  return { ok: true, pool };
}

export async function setDealState(id: string, state: "draft" | "published" | "ended", form?: DealForm, poolCodes: string[] = []): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("editor");
  let pool: SaveResult["pool"];
  if (form) {
    const saved = await saveDeal(id, form, poolCodes);
    pool = saved.pool;
    if (!saved.ok) return saved;
  }
  const { error } = await supabase.from("deals").update({ state }).eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { ok: false, pool, message: error.message.includes("codes missing") ? "codesMissing" : error.message.includes("legal pages missing") ? "legalMissing" : error.message.includes("plan limit deals_live") ? "planLimit" : "error" };
  refreshShop(tenant.id);
  if (state === "published") kickDealAlerts();
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true, pool };
}

/**
 * Delete a deal that never sold anything (owner/admin). The database decides (policy with
 * `deal_has_sales`); a deal with sales can only be archived.
 */
export async function deleteDeal(id: string): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("admin");
  const { data: sold } = await supabase.rpc("deal_has_sales", { p_deal: id });
  if (sold !== false) return { ok: false, message: "hasSales" };
  const { data, error } = await supabase.from("deals").delete().eq("id", id).eq("tenant_id", tenant.id).select("id");
  if (error || !data?.length) return { ok: false, message: "hasSales" };
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  redirect("/dashboard/deals");
}

/** Archive (owner/admin): out of the shop and the default list; a running deal is ended first. */
export async function archiveDeal(id: string): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("admin");
  const { data: deal } = await supabase.from("deals").select("state").eq("id", id).eq("tenant_id", tenant.id).maybeSingle();
  if (!deal) return { ok: false, message: "error" };
  const { error } = await supabase
    .from("deals")
    .update({ archived_at: new Date().toISOString(), featured: false, ...(deal.state === "published" ? { state: "ended" as const } : {}) })
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return { ok: false, message: "error" };
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true };
}

/** Back from the archive; the deal stays a draft or ended until it is published again. */
export async function restoreDeal(id: string): Promise<SaveResult> {
  const { tenant, supabase } = await requireTenant("admin");
  const { error } = await supabase.from("deals").update({ archived_at: null }).eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { ok: false, message: "error" };
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  return { ok: true };
}

/**
 * Permanent deletion: Sellycat staff only (with authenticator code), and only archived deals.
 * Orders and vouchers keep their own copy of title and price (deal_id becomes null).
 */
export async function deleteDealForever(id: string): Promise<SaveResult> {
  const staff = await requireStaff();
  const { tenant } = await requireTenant("editor");
  const admin = createAdminClient();
  const { data: deal } = await admin.from("deals").select("id, title, slug, archived_at, sold_qty").eq("id", id).eq("tenant_id", tenant.id).maybeSingle();
  if (!deal?.archived_at) return { ok: false, message: "error" };
  const { error } = await admin.from("deals").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { ok: false, message: "error" };
  await audit(staff.id, "deal.delete", { tenantId: tenant.id, type: "deal", id, meta: { title: deal.title, slug: deal.slug, sold: deal.sold_qty } });
  refreshShop(tenant.id);
  revalidatePath("/p/[locale]/dashboard/deals", "layout");
  redirect("/dashboard/deals?status=archived");
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
  | { ok: true; title: string; subtitle: string; description: JSONContent; terms: string; faq: Array<{ q: string; a: string }>; images: Array<{ url: string; alt: string }>; regularPrice: number | null; basic: boolean }
  | { ok: false; error: ImportError | "limit" | "invalid" };

/**
 * "Mit KI aus Link übernehmen": a draft from a product page; the chosen images are stored in the
 * shop's own storage. Nothing is saved to the deal: the editor shows the draft for review.
 */
export async function importDealFromUrl(url: string, pastedText?: string, withFaq = true): Promise<ImportResult> {
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
  const r = await importFromPage(target.toString(), info?.locale === "en" ? "en" : "de", typeof pastedText === "string" ? pastedText.slice(0, 60_000) : undefined, { withFaq: withFaq !== false });
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
  return { ok: true, title: r.draft.title, subtitle: r.draft.subtitle, description: blocksToDoc(r.draft.blocks), terms: r.draft.terms, faq: r.draft.faq, images, regularPrice: r.draft.regularPrice, basic: r.draft.basic };
}
