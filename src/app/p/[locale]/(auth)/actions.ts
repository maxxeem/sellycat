"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { apexUrl, siteHost, DEFAULT_ROOT, validateSlug } from "@/lib/site/hosts";
import { safeNext } from "@/lib/site/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSignupMode } from "@/lib/platform/settings";
import { registerDomain } from "@/lib/vercel/domains";
import { LEGAL_VERSION } from "@/lib/legal/docs";

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
});

export async function signupAction(_: AuthState, form: FormData): Promise<AuthState> {
  if ((await getSignupMode()) !== "open") return { error: "signupPausedTitle" };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "password" ? "passwordTooShort" : field === "accept" ? "acceptRequired" : "linkInvalid", field };
  }
  const { shopName, slug, email, password, locale } = parsed.data;
  const check = validateSlug(slug);
  if (!check.ok) return { error: check.reason === "reserved" ? "slugReserved" : "slugInvalid", field: "slug" };
  const { data: free } = await createAdminClient().rpc("slug_available", { p_slug: slug });
  if (!free) return { error: "slugTaken", field: "slug" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${apexUrl()}/auth/continue?next=/dashboard`,
      // Read back after email confirmation to create the shop (provisionFromSignup).
      // Which terms were accepted, and when (evidence for the contract; see /legal).
      data: { shop_name: shopName, shop_slug: slug, locale, terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() },
    },
  });
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
  const root = (siteHost() || DEFAULT_ROOT).split(":")[0];
  for (const candidate of [meta.shop_slug, `${meta.shop_slug.slice(0, 35)}-${Math.random().toString(36).slice(2, 6)}`]) {
    const { error } = await supabase.rpc("create_tenant", { p_name: meta.shop_name, p_slug: candidate, p_root: root, p_locale: meta.locale ?? "de" });
    if (!error) {
      await registerDomain(`${candidate}.${root}`);
      return;
    }
    if (!error.message.includes("duplicate")) return;
  }
}
