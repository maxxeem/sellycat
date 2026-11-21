"use server";

import { z } from "zod";
import { looksLikeBot } from "@/lib/access/rules";
import { clientIp, mailFrom, networkOf, rateLimit, verifyTurnstile } from "@/lib/access/server";
import { countryFromRequest } from "@/lib/billing/currency-server";
import { esc } from "@/lib/mail/templates";
import { mailConfigured, platformMailDomain, sendMail } from "@/lib/mail/mailgun";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContactFormState = { ok: true } | { ok: false; error: "fields" | "limit" | "failed" | "captcha" } | null;

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  company: z.string().trim().max(160).transform((s) => s || null),
  message: z.string().trim().min(5).max(4000),
  locale: z.enum(["de", "en"]),
});

/**
 * Contact form (/contact). Against robots: a hidden honeypot field, the time since the form was shown,
 * rate limits per network and per address in the database, and Cloudflare Turnstile once its keys are
 * set. Bots get the same «thanks» as people. Stored for staff (Staff → Anfragen) and mailed to
 * CONTACT_EMAIL (default hello@sellycat.com) with the sender as Reply-To.
 */
export async function sendContactMessage(_: ContactFormState, form: FormData): Promise<ContactFormState> {
  if (looksLikeBot({ honeypot: String(form.get("fax") ?? ""), renderedAt: Number(form.get("rendered_at")) })) return { ok: true };
  const parsed = schema.safeParse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    company: form.get("company") ?? "",
    message: form.get("message") ?? "",
    locale: form.get("locale") ?? "de",
  });
  if (!parsed.success) return { ok: false, error: "fields" };
  const ip = await clientIp();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) return { ok: false, error: "captcha" };
  if (!(await rateLimit("contact-ip", networkOf(ip), 5, 3600)) || !(await rateLimit("contact-mail", parsed.data.email, 3, 86_400))) return { ok: false, error: "limit" };

  const { name, email, company, message, locale } = parsed.data;
  const country = await countryFromRequest();
  const { error } = await createAdminClient().from("contact_requests").insert({ name, email, company, message, plan_id: null, locale, country });
  if (error) return { ok: false, error: "failed" };

  const to = process.env.CONTACT_EMAIL || "hello@sellycat.com";
  if (mailConfigured()) {
    const text = `${name}${company ? `, ${company}` : ""}\n${email}\n${country ?? "?"} · ${locale}\n\n${message}`;
    const sent = await sendMail({
      domain: platformMailDomain(),
      from: mailFrom(),
      replyTo: email,
      to,
      subject: `Kontakt: ${name}${company ? ` (${company})` : ""}`.replace(/[\r\n]+/g, " ").slice(0, 180),
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${esc(text)}</pre>`,
      tag: "contact-form",
    }).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!sent.ok) console.error("[contact] mail", sent.error);
  }
  return { ok: true };
}
