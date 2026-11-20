"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/platform/staff";
import { apexUrl, DEFAULT_ROOT, siteHost, validateSlug } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerDomain } from "@/lib/vercel/domains";

export type StaffFormState = { error?: string; ok?: boolean } | null;

const tenantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase(),
  ownerEmail: z.email(),
  locale: z.enum(["de", "en"]),
  planId: z.string().min(1),
});

/**
 * Staff creates a customer: tenant + primary subdomain + owner. The owner gets Supabase's
 * invitation mail (or, if the account exists already, is simply added).
 */
export async function createTenant(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const staff = await requireStaff();
  const parsed = tenantSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const { name, slug, ownerEmail, locale, planId } = parsed.data;
  const check = validateSlug(slug);
  if (!check.ok) return { error: `slug: ${check.reason}` };

  const db = createAdminClient();
  const root = (siteHost() || DEFAULT_ROOT).split(":")[0];

  // Owner account: invite a new user, or reuse an existing one.
  let ownerId: string | null = null;
  const invite = await db.auth.admin.inviteUserByEmail(ownerEmail, { redirectTo: `${apexUrl()}/auth/continue?next=/set-password` });
  if (invite.data.user) ownerId = invite.data.user.id;
  else {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    ownerId = data.users.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase())?.id ?? null;
  }
  if (!ownerId) return { error: invite.error?.message ?? "owner" };

  const { data: tenant, error } = await db.from("tenants").insert({ name, slug, locale, plan_id: planId, created_by: staff.id }).select("id").single();
  if (error || !tenant) return { error: error?.code === "23505" ? "slug taken" : (error?.message ?? "insert failed") };
  await db.from("tenant_members").insert({ tenant_id: tenant.id, user_id: ownerId, role: "owner" });
  await db.from("tenant_domains").insert({ tenant_id: tenant.id, hostname: `${slug}.${root}`, kind: "subdomain", status: "active", is_primary: true });
  const vercel = await registerDomain(`${slug}.${root}`);
  await audit(staff.id, "tenant.created", { tenantId: tenant.id, type: "tenant", id: tenant.id, meta: { slug, ownerEmail, vercel: vercel.message } });
  redirect(`/admin/tenants/${tenant.id}`);
}

const updateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["trial", "active", "suspended", "closed"]),
  planId: z.string().min(1),
  feeBps: z.string().optional(),
});

export async function updateTenant(_: StaffFormState, form: FormData): Promise<StaffFormState> {
  const staff = await requireStaff();
  const parsed = updateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  const { id, status, planId, feeBps } = parsed.data;
  const fee = feeBps && feeBps.trim() !== "" ? Math.round(Number(feeBps) * 100) : null;
  if (fee !== null && (!Number.isFinite(fee) || fee < 0 || fee > 5000)) return { error: "fee" };
  const { error } = await createAdminClient().from("tenants").update({ status, plan_id: planId, fee_override_bps: fee }).eq("id", id);
  if (error) return { error: error.message };
  await audit(staff.id, "tenant.updated", { tenantId: id, type: "tenant", id, meta: { status, planId, fee_override_bps: fee } });
  revalidatePath("/p/[locale]/staff/tenants/[id]", "page");
  return { ok: true };
}
