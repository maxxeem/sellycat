"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { cleanText, isSupportCategory, ownAttachment } from "@/lib/support/rules";
import { addCustomerMessage, createTicket, supportRequester } from "@/lib/support/support";

export type SupportResult = { ok: true; id?: string } | { ok: false; error: "fields" | "limit" | "failed" };

export async function submitTicket(input: { subject: string; category: string; body: string; locale: string; attachment: { path: string; name: string; bytes: number } | null }): Promise<SupportResult> {
  const req = await supportRequester();
  if (!req) return { ok: false, error: "failed" };
  const subject = cleanText(input.subject, 200);
  const body = cleanText(input.body, 10_000);
  if (!subject || !body || !isSupportCategory(input.category)) return { ok: false, error: "fields" };
  const r = await createTicket(req, { subject, body, category: input.category, locale: input.locale === "en" ? "en" : "de", attachment: ownAttachment(req.userId, input.attachment) });
  if (!r.ok) return r;
  revalidatePath("/p/[locale]/dashboard/support", "page");
  return { ok: true, id: r.id };
}

export async function replyTicket(ticketId: string, input: { body: string; attachment: { path: string; name: string; bytes: number } | null }): Promise<SupportResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "failed" };
  const body = cleanText(input.body, 10_000);
  if (!body) return { ok: false, error: "fields" };
  const ok = await addCustomerMessage(user.id, ticketId, body, ownAttachment(user.id, input.attachment));
  return ok ? { ok: true } : { ok: false, error: "failed" };
}
