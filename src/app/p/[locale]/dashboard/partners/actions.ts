"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshShop, requireTenant, str } from "@/lib/dashboard/context";
import { geocode } from "@/lib/geo/geocode";
import { placeDetails, placesConfigured, searchPlaces, type PlaceDetails, type PlaceSuggestion } from "@/lib/places/google";
import { createRateLimiter } from "@/lib/rate-limit";
import { parseHours, type OpeningHours } from "@/lib/shop/hours";
import { cleanBilling } from "@/lib/settlements/billing";
import { clearPartnerCode, inviteScanner, removeScanner, setPartnerCode, type PartnerCodeError, type ScannerError } from "@/lib/vouchers/scanners";

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

/** Billing details for statements (owners and admins: bank details are sensitive). */
export async function savePartnerBilling(partnerId: string, input: Record<string, string>): Promise<{ ok: boolean; error?: "iban" | "failed" }> {
  const { tenant, supabase } = await requireTenant("admin");
  const { billing, ibanInvalid } = cleanBilling(input);
  if (ibanInvalid) return { ok: false, error: "iban" };
  const { error } = await supabase.from("partners").update({ billing }).eq("id", partnerId).eq("tenant_id", tenant.id);
  revalidatePath("/p/[locale]/dashboard/partners", "layout");
  return error ? { ok: false, error: "failed" } : { ok: true };
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
  const address = { street: str(form, "street"), zip: str(form, "zip"), city: str(form, "city"), country: (str(form, "country") ?? "CH").toUpperCase().slice(0, 2) };
  // Coordinates from the Google place when one was chosen (and the address left as Google gave it), else geocoded.
  const lat = Number(str(form, "lat"));
  const lng = Number(str(form, "lng"));
  const fromPlace = str(form, "placeId") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && str(form, "lat") !== null;
  const coords = fromPlace ? { lat, lng } : await geocode(address);
  let hours: OpeningHours | null = null;
  try {
    hours = parseHours(JSON.parse(str(form, "hours") ?? "null"));
  } catch {
    hours = null;
  }
  const row = {
    tenant_id: tenant.id,
    partner_id: str(form, "partnerId") ?? "",
    name: str(form, "name") ?? "",
    ...address,
    hours: hours as never,
    // Structured hours replace the old free text.
    opening_hours: null,
    google_place_id: str(form, "placeId"),
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

const placesLimit = createRateLimiter({ limit: 120, windowMs: 60_000 });

/** Google business search while typing (editor and up; the key stays on the server). */
export async function findPlaces(query: string, sessionToken: string): Promise<{ configured: boolean; results: PlaceSuggestion[] }> {
  const { tenant, user } = await requireTenant("editor");
  if (!placesConfigured()) return { configured: false, results: [] };
  if (!placesLimit.check(`${tenant.id}:${user.id}`).ok) return { configured: true, results: [] };
  const locale = (await tenantLocale(tenant.id)) ?? "de";
  return { configured: true, results: await searchPlaces(query, sessionToken.slice(0, 80), locale) };
}

/** Address, position and opening hours of a chosen Google place. */
export async function getPlace(placeId: string, sessionToken: string): Promise<PlaceDetails | null> {
  const { tenant } = await requireTenant("editor");
  if (!placesConfigured()) return null;
  return placeDetails(placeId, sessionToken.slice(0, 80), (await tenantLocale(tenant.id)) ?? "de");
}

async function tenantLocale(tenantId: string): Promise<"de" | "en" | null> {
  const { supabase } = await requireTenant("editor");
  const { data } = await supabase.from("tenants").select("locale").eq("id", tenantId).single();
  return data?.locale === "en" ? "en" : data ? "de" : null;
}

export type ScannerResult = { ok: true; mailed?: boolean } | { ok: false; error: ScannerError };

/** Owner/admin invites an authorised scanner for this partner (name + email). */
export async function addScanner(partnerId: string, name: string, email: string): Promise<ScannerResult> {
  const { tenant } = await requireTenant("admin");
  const r = await inviteScanner(tenant.id, partnerId, name, email);
  revalidatePath(`/p/[locale]/dashboard/partners/[id]`, "page");
  return r;
}

export async function deleteScanner(partnerId: string, userId: string): Promise<ScannerResult> {
  const { tenant } = await requireTenant("admin");
  const ok = await removeScanner(tenant.id, partnerId, userId);
  revalidatePath(`/p/[locale]/dashboard/partners/[id]`, "page");
  return ok ? { ok: true } : { ok: false, error: "failed" };
}

/** Owner/admin sets the partner's code (typed, or a new one when empty). The code comes back once. */
export async function saveScanCode(partnerId: string, code: string): Promise<{ ok: true; code: string } | { ok: false; error: PartnerCodeError }> {
  const { tenant } = await requireTenant("admin");
  if (typeof partnerId !== "string" || typeof code !== "string" || code.length > 64) return { ok: false, error: "invalid" };
  const r = await setPartnerCode(tenant.id, partnerId, code);
  revalidatePath(`/p/[locale]/dashboard/partners/[id]`, "page");
  return r;
}

/** Back to authorised scanners: the code stops working at once. */
export async function removeScanCode(partnerId: string): Promise<{ ok: boolean }> {
  const { tenant } = await requireTenant("admin");
  const ok = await clearPartnerCode(tenant.id, partnerId);
  revalidatePath(`/p/[locale]/dashboard/partners/[id]`, "page");
  return { ok };
}
