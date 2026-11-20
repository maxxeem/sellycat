import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { LEGAL_VERSION } from "@/lib/legal/docs";
import { platformMailDomain, sendMail } from "@/lib/mail/mailgun";
import { platformBrand, waitlistConfirmMail } from "@/lib/mail/templates";
import { apexUrl } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCode, normaliseCode, type WaitlistInput } from "./rules";

/**
 * Signup access on the server: database-backed rate limits (keys hashed, never an IP in clear),
 * code checks without telling why a code fails, the waitlist with double opt-in and Turnstile
 * when it is configured. Every write uses the service role after these checks.
 */

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** IPv4 /24 or IPv6 /48: a whole small network counts as one, against rotating addresses. */
export function networkOf(ip: string): string {
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":");
  const p = ip.split(".");
  return p.length === 4 ? p.slice(0, 3).join(".") : ip;
}

/** One hit; false once over the limit. Fails closed: without the database nothing passes. */
export async function rateLimit(scope: string, id: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_hit", { p_key: `${scope}:${sha(`${scope}|${id}`)}`, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) {
    console.error("[access] rate limit", error.message);
    return false;
  }
  return data === true;
}

export const mailFrom = () => `Sellycat <hello@${platformMailDomain()}>`;
export const replyTo = () => process.env.SUPPORT_EMAIL ?? null;

// ---------------------------------------------------------------- codes

/** Limits per address/network for code guesses (attempts, then failures). */
const CODE_TRIES_PER_HOUR = 30;
const CODE_FAILS_PER_HOUR = 10;

/**
 * Is the code usable right now? (A personal code is still bound to its address at claim time.)
 * Rate-limited; any failure, including "too many attempts", gives the same false.
 */
export async function checkCode(raw: string): Promise<{ ok: boolean; code: string }> {
  const code = normaliseCode(raw);
  const net = networkOf(await clientIp());
  // Every attempt counts atomically (hard bound, also for parallel requests) ...
  if (!(await rateLimit("code-try", net, CODE_TRIES_PER_HOUR, 3600))) return { ok: false, code };
  // ... and after too many wrong ones even a right code is refused for the hour.
  if ((await currentHits("code-fail", net, 3600)) >= CODE_FAILS_PER_HOUR) return { ok: false, code };
  if (isValidCode(code) && (await codeUsable(code))) return { ok: true, code };
  await rateLimit("code-fail", net, CODE_FAILS_PER_HOUR, 3600);
  return { ok: false, code };
}

/** Records a failed code at signup (the claim refused it). */
export async function countCodeFailure(): Promise<void> {
  await rateLimit("code-fail", networkOf(await clientIp()), CODE_FAILS_PER_HOUR, 3600);
}

async function currentHits(scope: string, id: string, windowSeconds: number): Promise<number> {
  const start = new Date(Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds * 1000).toISOString();
  const { data } = await createAdminClient().from("rate_hits").select("hits").eq("key", `${scope}:${sha(`${scope}|${id}`)}`).eq("window_start", start).maybeSingle();
  return data?.hits ?? 0;
}

async function codeUsable(code: string): Promise<boolean> {
  const { data } = await createAdminClient().from("invite_codes").select("uses, max_uses, expires_at, disabled_at").eq("code", code).maybeSingle();
  if (!data || data.disabled_at) return false;
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return false;
  return data.max_uses === null || data.uses < data.max_uses;
}

// ---------------------------------------------------------------- Turnstile

export const turnstileSiteKey = () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

/** Without TURNSTILE_SECRET_KEY the check is off (honeypot, timing and rate limits still apply). */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !turnstileSiteKey()) return true;
  if (!token) return false;
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip !== "local") body.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- waitlist

const hashToken = (t: string) => sha(`waitlist|${t}`);

/**
 * Adds or refreshes an entry and sends the opt-in mail. The caller always shows the same answer:
 * nothing here tells whether the address was already on the list.
 */
export async function joinWaitlist(input: WaitlistInput): Promise<void> {
  const db = createAdminClient();
  const ip = await clientIp();
  if (!(await rateLimit("waitlist-ip", networkOf(ip), 10, 3600))) return;
  if (!(await rateLimit("waitlist-mail", input.email, 3, 86_400))) return;

  const { data: existing } = await db.from("waitlist").select("id, confirmed_at").eq("email", input.email).maybeSingle();
  if (existing?.confirmed_at) return; // already on the list: no second opt-in mail

  const token = randomBytes(32).toString("base64url");
  const row = {
    email: input.email,
    name: input.name,
    company: input.company,
    website: input.website,
    use_case: input.useCase,
    message: input.message,
    locale: input.locale,
    consent_at: new Date().toISOString(),
    consent_version: LEGAL_VERSION,
    confirm_token_hash: hashToken(token),
    confirm_sent_at: new Date().toISOString(),
  };
  const { error } = existing ? await db.from("waitlist").update(row).eq("id", existing.id) : await db.from("waitlist").insert(row);
  if (error) {
    console.error("[waitlist] save", error.message);
    return;
  }
  const site = apexUrl();
  const mail = waitlistConfirmMail({ brand: platformBrand(input.locale, site), name: input.name, url: `${site}/waitlist/confirm?token=${token}` });
  const sent = await sendMail({ domain: platformMailDomain(), from: mailFrom(), to: input.email, replyTo: replyTo(), subject: mail.subject, html: mail.html, text: mail.text, tag: "waitlist-confirm" });
  if (!sent.ok) console.error("[waitlist] confirm mail", sent.error);
}

/** Double opt-in: true when the token matched an unconfirmed entry (one-time). */
export async function confirmWaitlist(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) return false;
  if (!(await rateLimit("waitlist-confirm", networkOf(await clientIp()), 30, 3600))) return false;
  const { data } = await createAdminClient()
    .from("waitlist")
    .update({ confirmed_at: new Date().toISOString(), confirm_token_hash: null })
    .eq("confirm_token_hash", hashToken(token))
    .is("confirmed_at", null)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}
