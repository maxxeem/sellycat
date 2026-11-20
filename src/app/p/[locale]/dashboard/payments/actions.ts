"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refreshShop, requireTenant } from "@/lib/dashboard/context";
import { audit } from "@/lib/platform/staff";
import { CONNECT_COOKIE, authorizeUrl, signState } from "@/lib/payments/map";
import { syncAccount } from "@/lib/payments/orders";
import { connectClientId, getStripe, stateSecret, stripeConfigured } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { apexUrl } from "@/lib/site/hosts";

const PAGE = "/p/[locale]/dashboard/payments";

/** Start of Stripe Connect: off to Stripe, where the customer signs in to or creates their account. */
export async function connectStripe(): Promise<void> {
  const { user, tenant } = await requireTenant("admin");
  if (!stripeConfigured()) redirect("/dashboard/payments?error=config");
  const nonce = randomBytes(16).toString("base64url");
  const state = signState({ tenantId: tenant.id, userId: user.id, nonce, exp: Date.now() + 30 * 60_000 }, stateSecret());
  (await cookies()).set(CONNECT_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/stripe/connect", maxAge: 30 * 60 });
  const { data: t } = await createAdminClient().from("tenants").select("name, billing").eq("id", tenant.id).maybeSingle();
  const billing = (t?.billing ?? {}) as { country?: string };
  redirect(
    authorizeUrl({
      clientId: connectClientId()!,
      state,
      redirectUri: `${apexUrl()}/api/stripe/connect/callback`,
      email: user.email,
      businessName: t?.name,
      country: billing.country && /^[A-Z]{2}$/.test(billing.country) ? billing.country : "CH",
    }),
  );
}

/** Fetches the account status from Stripe now (instead of waiting for the webhook). */
export async function refreshStripe(): Promise<void> {
  const { tenant } = await requireTenant("admin");
  const { data: row } = await createAdminClient().from("stripe_accounts").select("account_id").eq("tenant_id", tenant.id).maybeSingle();
  if (row && stripeConfigured()) {
    await syncAccount(await getStripe().accounts.retrieve(row.account_id));
    refreshShop(tenant.id);
  }
  revalidatePath(PAGE, "page");
}

/** Owners only: Sellycat loses access; the Stripe account itself stays with the customer. */
export async function disconnectStripe(): Promise<void> {
  const { user, tenant } = await requireTenant("owner");
  const admin = createAdminClient();
  const { data: row } = await admin.from("stripe_accounts").select("account_id").eq("tenant_id", tenant.id).maybeSingle();
  if (!row) return;
  // Other shops on the same Stripe account keep their access: only the last one revokes it at Stripe.
  const { count: others } = await admin.from("stripe_accounts").select("tenant_id", { count: "exact", head: true }).eq("account_id", row.account_id).neq("tenant_id", tenant.id);
  if (stripeConfigured() && !others) {
    try {
      await getStripe().oauth.deauthorize({ client_id: connectClientId()!, stripe_user_id: row.account_id });
    } catch (e) {
      // Already revoked on Stripe's side: removing our record is still right.
      console.warn("[stripe] deauthorize:", e instanceof Error ? e.message : e);
    }
  }
  await admin.from("stripe_accounts").delete().eq("tenant_id", tenant.id);
  await audit(user.id, "stripe.disconnect", { tenantId: tenant.id, type: "stripe_account", id: row.account_id });
  refreshShop(tenant.id);
  revalidatePath(PAGE, "page");
}
