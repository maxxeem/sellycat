"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TENANT_COOKIE } from "@/lib/auth/tenants";
import { z } from "zod";
import { apexUrl, siteHost, DEFAULT_ROOT, validateSlug } from "@/lib/site/hosts";
import { safeNext } from "@/lib/site/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSignupMode } from "@/lib/platform/settings";
import { registerDomain } from "@/lib/vercel/domains";
import { LEGAL_VERSION } from "@/lib/legal/docs";
import { codeRequired, normaliseCode } from "@/lib/access/rules";
import { clientIp, countCodeFailure, networkOf, rateLimit } from "@/lib/access/server";
import { after } from "next/server";
import { sendWelcomeMail } from "@/lib/mail/onboarding";

/** Error/notice keys map to the `auth` dictionary on the client. */
export type AuthState = { error?: string; notice?: string; field?: string } | null;

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "loginFailed" };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function forgotAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  if (email) {
    const supabase = await createClient();
    // Same answer whether or not the account exists (no account enumeration).
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${apexUrl()}/auth/continue?next=/set-password` });
  }
  return { notice: "forgotSent" };
}

export async function setPasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "passwordTooShort", field: "password" };
  if (password !== String(form.get("repeat") ?? "")) return { error: "passwordMismatch", field: "repeat" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "linkInvalid" };
  redirect("/dashboard");
}

const signupSchema = z.object({
  shopName: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase(),
  email: z.email(),
  password: z.string().min(10),
  locale: z.enum(["de", "en"]),
  accept: z.literal("on"),
  code: z.string().max(60).optional().default(""),
});

export async function signupAction(_: AuthState, form: FormData): Promise<AuthState> {
  const mode = await getSignupMode();
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "password" ? "passwordTooShort" : field === "accept" ? "acceptRequired" : "linkInvalid", field };
  }
  const { shopName, slug, email, password, locale } = parsed.data;
  const code = normaliseCode(parsed.data.code);
  if (codeRequired(mode) && !code) return { error: "codeRequired", field: "code" };
  if (!(await rateLimit("signup", networkOf(await clientIp()), 10, 3600))) return { error: "rateLimited" };
  const check = validateSlug(slug);
  if (!check.ok) return { error: check.reason === "reserved" ? "slugReserved" : "slugInvalid", field: "slug" };
  const db = createAdminClient();
  const { data: free } = await db.rpc("slug_available", { p_slug: slug });
  if (!free) return { error: "slugTaken", field: "slug" };

  // The code's slot is held before the account exists (atomic), and given back if signup fails.
  let use: string | null = null;
  if (code) {
    use = (await db.rpc("claim_invite_code", { p_code: code, p_email: email })).data ?? null;
    if (!use) {
      await countCodeFailure();
      return { error: "codeInvalid", field: "code" };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${apexUrl()}/auth/continue?next=/dashboard`,
      // Read back after email confirmation to create the shop (provisionFromSignup).
      // Which terms were accepted, and when (evidence for the contract; see /legal).
      data: { shop_name: shopName, shop_slug: slug, locale, terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() },
    },
  });
  // An existing address comes back without identities: same answer, but the slot is released.
  const fresh = !error && data.user && (data.user.identities?.length ?? 0) > 0;
  if (use) {
    if (fresh) await db.rpc("attach_invite_user", { p_use: use, p_user: data.user!.id });
    else await db.rpc("release_invite_use", { p_use: use });
  }
  if (error) return { error: "linkInvalid" };
  return { notice: "signupCheckMail" };
}

/**
 * After the first confirmed sign-in: creates the shop the user asked for at signup, unless they
 * already belong to one. A slug taken in the meantime gets a short suffix.
 */
export async function provisionFromSignup(): Promise<void> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const meta = (claims?.claims?.user_metadata ?? {}) as { shop_name?: string; shop_slug?: string; locale?: string };
  if (!claims?.claims?.sub || !meta.shop_slug || !meta.shop_name) return;
  const { data: mine } = await supabase.rpc("my_tenants");
  if (mine && mine.length > 0) return;
  const userId = claims.claims.sub;
  const db = createAdminClient();
  // An invite use becomes confirmed now (a slot released in the meantime is taken again if free).
  await db.rpc("confirm_invite_use", { p_user: userId });
  const root = (siteHost() || DEFAULT_ROOT).split(":")[0];
  for (const candidate of [meta.shop_slug, `${meta.shop_slug.slice(0, 35)}-${Math.random().toString(36).slice(2, 6)}`]) {
    const { data: tenantId, error } = await supabase.rpc("create_tenant", { p_name: meta.shop_name, p_slug: candidate, p_root: root, p_locale: meta.locale ?? "de" });
    if (!error) {
      // Links the code (plan, trial, coupon) and marks the waitlist entry as registered.
      await db.rpc("finish_invite_signup", { p_user: userId, p_tenant: tenantId });
      await registerDomain(`${candidate}.${root}`);
      after(() => sendWelcomeMail(tenantId).catch((e) => console.error("[welcome mail]", e instanceof Error ? e.message : e)));
      return;
    }
    if (!error.message.includes("duplicate")) return;
  }
}

const welcomeSchema = z.object({
  shopName: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase(),
  code: z.string().optional().default(""),
  locale: z.enum(["de", "en"]),
  accept: z.literal("on"),
});

/**
 * /welcome: a signed-in account without a shop (Google sign-in) creates its shop. Same rules as
 * the email signup: invite code when signup is not open (staff excepted), terms accepted.
 */
export async function welcomeAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = welcomeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "accept" ? "acceptRequired" : field === "slug" ? "slugInvalid" : "linkInvalid", field };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email) return { error: "linkInvalid" };
  // A first shop only, unless the form comes from /new-shop (an additional shop, same checks).
  const { data: mine } = await supabase.rpc("my_tenants");
  const additional = Boolean(mine && mine.length > 0);
  if (additional && form.get("additional") !== "1") redirect("/dashboard");
  // Room in a plan that includes several shops (Business): no code needed, create_tenant attaches it.
  const included = additional && ((await supabase.rpc("included_shop_room")).data ?? 0) > 0;
  const { shopName, slug, locale } = parsed.data;
  const code = normaliseCode(parsed.data.code);
  const mode = await getSignupMode();
  const staff = (await supabase.rpc("is_staff")).data === true;
  if (!(await rateLimit("welcome", networkOf(await clientIp()), 10, 3600))) return { error: "rateLimited" };
  const check = validateSlug(slug);
  if (!check.ok) return { error: check.reason === "reserved" ? "slugReserved" : "slugInvalid", field: "slug" };
  const db = createAdminClient();
  const { data: free } = await db.rpc("slug_available", { p_slug: slug });
  if (!free) return { error: "slugTaken", field: "slug" };

  // A code counts in every mode (plan, trial, coupon); without one only open signup (or staff) passes.
  if (!included && (code || (codeRequired(mode) && !staff))) {
    if (!code) return { error: "codeRequired", field: "code" };
    // A use confirmed on an earlier try that found no shop yet (slug taken meanwhile) is reused,
    // so a retry never spends a second slot (a one-time code would otherwise lock the person out).
    const { data: held } = await db.from("invite_code_uses").select("id").eq("user_id", user.id).eq("status", "confirmed").is("tenant_id", null).limit(1).maybeSingle();
    if (!held) {
      // The account exists already (Google): claim, attach and confirm the use in one go.
      const use = (await db.rpc("claim_invite_code", { p_code: code, p_email: user.email })).data ?? null;
      if (!use) {
        await countCodeFailure();
        return { error: "codeInvalid", field: "code" };
      }
      await db.rpc("attach_invite_user", { p_use: use, p_user: user.id });
      await db.rpc("confirm_invite_use", { p_user: user.id });
    }
  }

  await supabase.auth.updateUser({ data: { locale, terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() } });
  const root = (siteHost() || DEFAULT_ROOT).split(":")[0];
  for (const candidate of [slug, `${slug.slice(0, 35)}-${Math.random().toString(36).slice(2, 6)}`]) {
    const { data: tenantId, error } = await supabase.rpc("create_tenant", { p_name: shopName, p_slug: candidate, p_root: root, p_locale: locale });
    if (!error) {
      await db.rpc("finish_invite_signup", { p_user: user.id, p_tenant: tenantId });
      await registerDomain(`${candidate}.${root}`);
      after(() => sendWelcomeMail(tenantId).catch((e) => console.error("[welcome mail]", e instanceof Error ? e.message : e)));
      // Open the new shop (an account with shops already would otherwise land in the previous one).
      (await cookies()).set(TENANT_COOKIE, tenantId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
      redirect("/dashboard");
    }
    if (!error.message.includes("duplicate")) return { error: error.message.includes("paused") ? "codeRequired" : "linkInvalid", field: error.message.includes("paused") ? "code" : undefined };
  }
  return { error: "slugTaken", field: "slug" };
}
