"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TENANT_COOKIE } from "@/lib/auth/tenants";
import { hashToken } from "@/lib/team/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error?: "password" | "failed" | "other" } | null;

async function rememberShop(tenantId: string) {
  (await cookies()).set(TENANT_COOKIE, tenantId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
}

/** Signed in with the invited address: join and open the shop's dashboard. */
export async function acceptInvite(token: string): Promise<AcceptState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !data) return { error: error?.message.includes("another address") ? "other" : "failed" };
  await rememberShop(data);
  redirect("/dashboard");
}

/**
 * A new account (created by the invitation, never signed in): set its password, sign in and join.
 * The invitation link is the proof of the address, like a sign-in link.
 */
export async function acceptWithPassword(token: string, _prev: AcceptState, form: FormData): Promise<AcceptState> {
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (password.length < 10 || password.length > 200) return { error: "password" };
  const admin = createAdminClient();
  const { data: invite } = await admin.from("tenant_invites").select("email, accepted_at, expires_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!invite || invite.accepted_at || new Date(invite.expires_at) <= new Date()) return { error: "failed" };
  const email = String(invite.email);
  const { data: userId } = await admin.rpc("auth_user_id", { p_email: email });
  if (!userId) return { error: "failed" };
  const { data: user } = await admin.auth.admin.getUserById(userId);
  // Only for accounts nobody has used yet; everyone else signs in normally.
  if (!user.user || user.user.last_sign_in_at) return { error: "failed" };
  const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password, ...(name ? { user_metadata: { ...user.user.user_metadata, full_name: name } } : {}) });
  if (pwError) return { error: "failed" };
  if (name) await admin.from("profiles").upsert({ user_id: userId, full_name: name }, { onConflict: "user_id" });
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: "failed" };
  return acceptInvite(token);
}

export async function signOutForInvite(token: string): Promise<void> {
  await (await createClient()).auth.signOut({ scope: "local" });
  redirect(`/invite/${encodeURIComponent(token)}`);
}
