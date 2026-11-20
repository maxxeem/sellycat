"use server";

import { looksLikeBot, waitlistSchema } from "@/lib/access/rules";
import { checkCode, clientIp, confirmWaitlist, joinWaitlist, verifyTurnstile } from "@/lib/access/server";

export type CodeState = { ok: true; code: string } | { ok: false; error: "codeInvalid" } | null;
export type WaitlistState = { sent: true } | { sent: false; error: "error" | "websiteInvalid" | "consentRequired" | "captcha"; field?: string } | null;
export type ConfirmState = { done: boolean } | null;

/** Code step before the signup form. One answer for every failure (no hint why). */
export async function checkCodeAction(_: CodeState, form: FormData): Promise<CodeState> {
  const r = await checkCode(String(form.get("code") ?? ""));
  return r.ok ? { ok: true, code: r.code } : { ok: false, error: "codeInvalid" };
}

/** Waitlist form (landing page and /signup). Bots and duplicates get the same "check your inbox". */
export async function joinWaitlistAction(_: WaitlistState, form: FormData): Promise<WaitlistState> {
  if (looksLikeBot({ honeypot: String(form.get("fax") ?? ""), renderedAt: Number(form.get("rendered_at")) })) return { sent: true };
  const raw = Object.fromEntries(form);
  const parsed = waitlistSchema.safeParse({
    email: raw.email ?? "",
    name: raw.name ?? "",
    company: raw.company ?? "",
    website: raw.website ?? "",
    useCase: raw.useCase ?? "",
    message: raw.message ?? "",
    locale: raw.locale ?? "de",
    consent: raw.consent ?? "",
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    if (field === "website") return { sent: false, error: "websiteInvalid", field };
    if (field === "consent") return { sent: false, error: "consentRequired", field };
    return { sent: false, error: "error", field };
  }
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), await clientIp()))) return { sent: false, error: "captcha" };
  await joinWaitlist(parsed.data);
  return { sent: true };
}

export async function confirmWaitlistAction(_: ConfirmState, form: FormData): Promise<ConfirmState> {
  return { done: await confirmWaitlist(String(form.get("token") ?? "")) };
}
