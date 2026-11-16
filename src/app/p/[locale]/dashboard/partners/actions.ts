"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshShop, requireTenant, str } from "@/lib/dashboard/context";
import { geocode } from "@/lib/geo/geocode";

export type FormState = { error?: string; ok?: boolean } | null;

const httpUrl = (v: string | null) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);

export async function savePartner(_: FormState, form: FormData): Promise<FormState> {
  const { tenant, supabase } = await requireTenant("editor");
  const id = str(form, "id");
  const row = {
    tenant_id: tenant.id,
    name: str(form, "name") ?? "",
    description: str(form, "description"),
    website_url: httpUrl(str(form, "website")),
    email: str(form, "email"),
    phone: str(form, "phone"),
    logo_url: str(form, "logo"),
  };
  if (!row.name) return { error: "name" };
  if (id) {
    const { error } = await supabase.from("partners").update(row).eq("id", id).eq("tenant_id", tenant.id);
    if (error) return { error: error.message };
    refreshShop(tenant.id);
    revalidatePath("/p/[locale]/dashboard/partners", "layout");
    return { ok: true };
  }
  const { data, error } = await supabase.from("partners").insert(row).select("id").single();
  if (error || !data) return { error: error?.message ?? "insert" };
  redirect(`/dashboard/partners/${data.id}`);
}

export async function deletePartner(id: string) {
  const { tenant, supabase } = await requireTenant("admin");
  await supabase.from("partners").delete().eq("id", id).eq("tenant_id", tenant.id);
  refreshShop(tenant.id);
  redirect("/dashboard/partners");
}

export async function saveLocation(_: FormState, form: FormData): Promise<FormState> {
  const { tenant, supabase } = await requireTenant("editor");
  const id = str(form, "id");
  const address = { street: str(form, "street"), zip: str(form, "zip"), city: str(form, "city"), country: str(form, "country") ?? "CH" };
  const coords = await geocode(address);
  const row = {
    tenant_id: tenant.id,
    partner_id: str(form, "partnerId") ?? "",
    name: str(form, "name") ?? "",
    ...address,
    opening_hours: str(form, "openingHours"),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };
  if (!row.name || !row.partner_id) return { error: "name" };
  const { error } = id
    ? await supabase.from("partner_locations").update(row).eq("id", id).eq("tenant_id", tenant.id)
    : await supabase.from("partner_locations").insert(row);
  if (error) return { error: error.message };
  refreshShop(tenant.id);
  revalidatePath(`/p/[locale]/dashboard/partners/[id]`, "page");
  return { ok: true };
}

export async function deleteLocation(id: string) {
  const { tenant, supabase } = await requireTenant("editor");
  await supabase.from("partner_locations").delete().eq("id", id).eq("tenant_id", tenant.id);
  refreshShop(tenant.id);
  revalidatePath(`/p/[locale]/dashboard/partners/[id]`, "page");
}
