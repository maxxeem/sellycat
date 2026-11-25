"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/dashboard/context";
import { FAQ_LIBRARY_MAX, cleanFaq } from "@/lib/shop/faq-library";

export type FaqResult = { ok: true } | { ok: false; error: "invalid" | "full" | "failed" };
const done = (): FaqResult => {
  revalidatePath("/p/[locale]/dashboard/faq", "page");
  return { ok: true };
};

/** Adds an entry (id null) or changes one (editor and up; RLS keeps shops apart). */
export async function saveFaq(id: string | null, q: string, a: string): Promise<FaqResult> {
  const { tenant, supabase } = await requireTenant("editor");
  const entry = cleanFaq({ q, a });
  if (!entry) return { ok: false, error: "invalid" };
  const row = { question: entry.q, answer: entry.a };
  if (id) {
    const { error } = await supabase.from("faq_library").update(row).eq("id", id).eq("tenant_id", tenant.id);
    return error ? { ok: false, error: "failed" } : done();
  }
  const { count } = await supabase.from("faq_library").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
  if ((count ?? 0) >= FAQ_LIBRARY_MAX) return { ok: false, error: "full" };
  const { error } = await supabase.from("faq_library").insert({ tenant_id: tenant.id, ...row });
  return error ? { ok: false, error: "failed" } : done();
}

export async function deleteFaq(id: string): Promise<FaqResult> {
  const { tenant, supabase } = await requireTenant("editor");
  const { error } = await supabase.from("faq_library").delete().eq("id", id).eq("tenant_id", tenant.id);
  return error ? { ok: false, error: "failed" } : done();
}
