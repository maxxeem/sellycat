"use server";

import { revalidatePath } from "next/cache";
import { refreshShop, requireTenant, str } from "@/lib/dashboard/context";
import type { JSONContent } from "@tiptap/core";
import { slugifyTitle } from "@/lib/shop/deal-input";
import { docToPlain, isDoc } from "@/lib/shop/rich-text";

export type FormState = { error?: string; ok?: boolean } | null;
const done = (tenantId: string): FormState => {
  refreshShop(tenantId);
  revalidatePath("/p/[locale]/dashboard/settings", "page");
  return { ok: true };
};

export async function saveShopSettings(_: FormState, form: FormData): Promise<FormState> {
  const { tenant, supabase } = await requireTenant("admin");
  const name = str(form, "name");
  const locale = str(form, "locale");
  if (!name || (locale !== "de" && locale !== "en")) return { error: "invalid" };
  const ga4 = str(form, "ga4");
  const pixel = str(form, "metaPixel");
  if (ga4 && !/^G-[A-Z0-9]{4,20}$/.test(ga4)) return { error: "ga4" };
  // The code alone or the whole <meta> tag from Search Console.
  const google = (/content=["']([^"']+)/.exec(str(form, "googleVerification") ?? "")?.[1] ?? str(form, "googleVerification") ?? "").trim();
  if (google && !/^[A-Za-z0-9_-]{20,100}$/.test(google)) return { error: "googleVerification" };
  if (pixel && !/^\d{6,20}$/.test(pixel)) return { error: "metaPixel" };
  // Keep the other settings (deal order …) that this form does not show.
  const { data: current } = await supabase.from("tenants").select("shop_settings").eq("id", tenant.id).single();
  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      locale,
      mail_from_name: str(form, "mailFromName"),
      reply_to: str(form, "replyTo"),
      shop_settings: {
        ...((current?.shop_settings as Record<string, unknown> | null) ?? {}),
        contact_email: str(form, "contactEmail"),
        contact_phone: str(form, "contactPhone"),
        seo_title: str(form, "seoTitle")?.slice(0, 120) ?? null,
        google_verification: google || null,
        seo_description: str(form, "seoDescription"),
        ga4_id: ga4,
        meta_pixel_id: pixel,
      },
    })
    .eq("id", tenant.id);
  return error ? { error: error.message } : done(tenant.id);
}

export async function saveBilling(_: FormState, form: FormData): Promise<FormState> {
  const { tenant, supabase } = await requireTenant("admin");
  const billing = Object.fromEntries(["legal_name", "street", "zip", "city", "country", "vat_no"].map((k) => [k, str(form, k)]));
  const { error } = await supabase.from("tenants").update({ billing }).eq("id", tenant.id);
  return error ? { error: error.message } : done(tenant.id);
}

/** A posted legal document (Tiptap JSON, at most 200 kB), or null. */
function legalDoc(raw: FormDataEntryValue | null): JSONContent | null {
  if (typeof raw !== "string" || raw.length > 200_000) return null;
  try {
    const doc = JSON.parse(raw) as unknown;
    return isDoc(doc) ? doc : null;
  } catch {
    return null;
  }
}

export async function saveLegal(_: FormState, form: FormData): Promise<FormState> {
  const { tenant, supabase } = await requireTenant("admin");
  const rows = (["imprint", "terms", "privacy"] as const).map((kind) => {
    const doc = legalDoc(form.get(kind));
    // The document for the shop, its plain text for the completeness check.
    return { tenant_id: tenant.id, kind, content_doc: doc, content: docToPlain(doc).slice(0, 100_000) };
  });
  if (rows.some((r) => !r.content_doc)) return { error: "invalid" };
  const { error } = await supabase.from("legal_pages").upsert(rows, { onConflict: "tenant_id,kind" });
  return error ? { error: error.message } : done(tenant.id);
}

export async function addCategory(_: FormState, form: FormData): Promise<FormState> {
  const { tenant, supabase } = await requireTenant("editor");
  const name = str(form, "name");
  if (!name) return { error: "name" };
  const slug = slugifyTitle(name).slice(0, 60) || `k-${Date.now().toString(36)}`;
  const { error } = await supabase.from("categories").insert({ tenant_id: tenant.id, name, slug });
  return error ? { error: error.code === "23505" ? "exists" : error.message } : done(tenant.id);
}

export async function deleteCategory(id: string) {
  const { tenant, supabase } = await requireTenant("editor");
  await supabase.from("categories").delete().eq("id", id).eq("tenant_id", tenant.id);
  done(tenant.id);
}
