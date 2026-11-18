"use server";

import { headers } from "next/headers";
import { createRateLimiter } from "@/lib/rate-limit";
import { countryFromRequest } from "@/lib/billing/currency-server";
import { mailConfigured, platformMailDomain, sendMail } from "@/lib/mail/mailgun";
import { createAdminClient } from "@/lib/supabase/admin";

const limit = createRateLimiter({ limit: 5, windowMs: 3_600_000 });
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export type ContactState = { ok?: boolean; error?: "fields" | "limit" | "failed" } | null;

/** «Kontakt aufnehmen» on the pricing page: stored for staff (Staff → Anfragen), mailed to sales if set. */
export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Honeypot: bots fill every field.
  if (clean(form.get("website"), 200)) return { ok: true };
  const name = clean(form.get("name"), 120);
  const email = clean(form.get("email"), 200).toLowerCase();
  const company = clean(form.get("company"), 160) || null;
  const message = clean(form.get("message"), 4000);
  const plan = clean(form.get("plan"), 32) || null;
  const locale = clean(form.get("locale"), 2) === "en" ? "en" : "de";
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "fields" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!limit.check(ip).ok) return { error: "limit" };
  const country = await countryFromRequest();
  const { error } = await createAdminClient().from("contact_requests").insert({ name, email, company, message, plan_id: plan, locale, country });
  if (error) return { error: "failed" };
  const to = process.env.SALES_EMAIL;
  if (to && mailConfigured()) {
    const text = `${name}${company ? `, ${company}` : ""}\n${email}\nPlan: ${plan ?? "–"} · ${country ?? "?"} · ${locale}\n\n${message}`;
    const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    await sendMail({
      domain: platformMailDomain(),
      from: `Sellycat <hallo@${platformMailDomain()}>`,
      replyTo: email,
      to,
      subject: `Anfrage ${plan ?? ""} von ${name}${company ? ` (${company})` : ""}`.replace(/\s+/g, " "),
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${esc}</pre>`,
      tag: "contact-request",
    }).catch((e) => console.error("[contact] mail", e));
  }
  return { ok: true };
}
