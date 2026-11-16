"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { dealRow, validateDeal, type DealErrors, type DealForm } from "@/lib/shop/deal-input";
import { EMPTY_DOC } from "@/lib/shop/rich-text";

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
