"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TENANT_COOKIE, getMyTenants } from "@/lib/auth/tenants";
import { createClient } from "@/lib/supabase/server";

export async function switchTenant(tenantId: string) {
  const tenants = await getMyTenants();
  if (!tenants.some((t) => t.id === tenantId)) return;
  (await cookies()).set(TENANT_COOKIE, tenantId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
