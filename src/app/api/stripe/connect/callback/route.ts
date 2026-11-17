import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getMyTenants, roleAtLeast } from "@/lib/auth/tenants";
import { getSessionUser } from "@/lib/auth/session";
import { CONNECT_COOKIE, accountState, verifyState } from "@/lib/payments/map";
import { getStripe, stateSecret, stripeConfigured, stripeLivemode } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/platform/staff";

/**
 * Return from Stripe Connect OAuth. Completes only for the signed-in user who started it, in the
 * same browser (nonce cookie), while they are still owner or admin of that shop. The code is
 * exchanged for the account id, which is stored with the account's current status.
 */
export async function GET(request: NextRequest) {
  const done = (query: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/payments?${query}`, request.url));
    res.cookies.delete({ name: CONNECT_COOKIE, path: "/api/stripe/connect" });
    return res;
  };
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return done(`error=${params.get("error") === "access_denied" ? "denied" : "stripe"}`);
  if (!stripeConfigured()) return done("error=config");

  const state = verifyState(params.get("state"), stateSecret());
  const nonce = request.cookies.get(CONNECT_COOKIE)?.value;
  const user = await getSessionUser();
  if (!state || !nonce || state.nonce !== nonce || !user || user.id !== state.userId) return done("error=state");
  const tenant = (await getMyTenants()).find((t) => t.id === state.tenantId);
  if (!tenant || !roleAtLeast(tenant.role, "admin")) return done("error=state");

  const code = params.get("code");
  if (!code) return done("error=stripe");
  const stripe = getStripe();
  let accountId: string;
  try {
    const token = await stripe.oauth.token({ grant_type: "authorization_code", code });
    if (!token.stripe_user_id) throw new Error("no account in token response");
    accountId = token.stripe_user_id;
  } catch (e) {
    console.error("[stripe connect] token:", e instanceof Error ? e.message : e);
    return done("error=stripe");
  }

  const admin = createAdminClient();
  // The same Stripe account may serve several shops (whoever authorised it at Stripe controls it).
  const account = await stripe.accounts.retrieve(accountId);
  const { error } = await admin
    .from("stripe_accounts")
    .upsert({ tenant_id: tenant.id, account_id: accountId, livemode: stripeLivemode(), ...accountState(account), connected_at: new Date().toISOString() }, { onConflict: "tenant_id" });
  if (error) return done("error=stripe");
  // Apple Pay in the embedded checkout needs the shop's domains registered on its Stripe account.
  const { data: domains } = await admin.from("tenant_domains").select("hostname").eq("tenant_id", tenant.id).eq("status", "active");
  await Promise.all(
    (domains ?? []).map((d) =>
      stripe.paymentMethodDomains.create({ domain_name: d.hostname }, { stripeAccount: accountId }).catch((e: unknown) => console.warn(`[stripe connect] domain ${d.hostname}:`, e instanceof Error ? e.message : e)),
    ),
  );
  await audit(user.id, "stripe.connect", { tenantId: tenant.id, type: "stripe_account", id: accountId });
  revalidateTag(`shop:${tenant.id}`, "max");
  return done("connected=1");
}
