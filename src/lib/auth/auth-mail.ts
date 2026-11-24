import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { apexUrl } from "@/lib/site/hosts";
import { platformMailDomain, sendMail } from "@/lib/mail/mailgun";
import { authMail, platformBrand, type AuthMailKind } from "@/lib/mail/templates";
import { authLink } from "./auth-link";

/**
 * Sellycat's own auth mails instead of Supabase's. Their links carry a `token_hash`, which (unlike
 * Supabase's default link) works in any browser and is only redeemed by a click on /auth/continue,
 * so link scanners (Outlook Safe Links and the like) cannot use it up before the person does.
 */

/**
 * `reconfirm` is a recovery link: without the password at hand it is the only type that confirms an
 * address, and Supabase drops the unproven password then, so the person sets a new one.
 */
const LINK_TYPE = { reconfirm: "recovery", recovery: "recovery", invite: "invite" } as const;

const mailLocale = (v: unknown) => (v === "en" ? ("en" as const) : ("de" as const));

/** Creates the one-time link and sends it. `invite` creates the account. Returns the user's id. */
export async function sendAuthMail(kind: keyof typeof LINK_TYPE, email: string, locale?: "de" | "en"): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: LINK_TYPE[kind], email });
  if (error || !data.user || !data.properties?.hashed_token) return { ok: false, error: error?.message ?? "no link" };
  const url = authLink(apexUrl(), data.properties.hashed_token, data.properties.verification_type, "/set-password");
  const sent = await send(kind, email, locale ?? mailLocale(data.user.user_metadata?.locale), url);
  return sent ? { ok: true, userId: data.user.id } : { ok: false, error: "mail" };
}

/** Creates the (unconfirmed) account of a signup; `send` delivers its confirmation mail. */
export async function createSignup(email: string, password: string, locale: "de" | "en", meta: Record<string, string>): Promise<{ ok: true; userId: string; send: () => Promise<boolean> } | { ok: false; code?: string; error: string }> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "signup", email, password, options: { data: meta } });
  if (error || !data.user || !data.properties?.hashed_token) return { ok: false, code: error?.code, error: error?.message ?? "no link" };
  const url = authLink(apexUrl(), data.properties.hashed_token, data.properties.verification_type, "/dashboard");
  return { ok: true, userId: data.user.id, send: () => send("confirm", email, locale, url) };
}

async function send(kind: AuthMailKind, email: string, locale: "de" | "en", url: string): Promise<boolean> {
  const domain = platformMailDomain();
  const mail = authMail({ kind, brand: platformBrand(locale, apexUrl()), url });
  const sent = await sendMail({ domain, from: `Sellycat <noreply@${domain}>`, to: email, replyTo: process.env.SUPPORT_EMAIL ?? "hello@sellycat.com", ...mail, tag: `auth-${kind}` });
  if (!sent.ok) console.error(`[auth mail] ${kind}`, sent.error);
  return sent.ok;
}

/** A new confirmation link, only for an existing account whose address is not confirmed yet. */
export async function resendConfirmation(email: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: id } = await db.rpc("auth_user_id", { p_email: email });
  if (!id) return false;
  const { data } = await db.auth.admin.getUserById(id);
  if (!data.user || data.user.email_confirmed_at) return false;
  return (await sendAuthMail("reconfirm", email)).ok;
}
