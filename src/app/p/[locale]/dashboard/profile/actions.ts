"use server";

import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Profile and account of the signed-in person (never anyone else's). */

export type ProfileResult = { ok: true } | { ok: false; error: "name" | "password" | "mismatch" | "owner" | "staff" | "confirm" | "failed" };

export async function saveName(name: string): Promise<ProfileResult> {
  const clean = name.trim().slice(0, 120);
  if (!clean) return { ok: false, error: "name" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: clean } });
  return error ? { ok: false, error: "failed" } : { ok: true };
}

export async function savePassword(password: string, repeat: string): Promise<ProfileResult> {
  if (password.length < 10) return { ok: false, error: "password" };
  if (password !== repeat) return { ok: false, error: "mismatch" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, error: "failed" } : { ok: true };
}

/**
 * Deletes the account. Not while the person owns a shop (it would be left without an owner: hand
 * it over or close it first) and not for Sellycat staff. Memberships go with the account.
 */
export async function deleteAccount(confirm: string): Promise<ProfileResult> {
  if (!["LÖSCHEN", "LOESCHEN", "DELETE"].includes(confirm.trim().toUpperCase())) return { ok: false, error: "confirm" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");
  if (await getStaffUser()) return { ok: false, error: "staff" };
  const admin = createAdminClient();
  const { count } = await admin.from("tenant_members").select("tenant_id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "owner");
  if ((count ?? 0) > 0) return { ok: false, error: "owner" };
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "failed" };
  await supabase.auth.signOut();
  redirect("/");
}
