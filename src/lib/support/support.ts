import "server-only";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { mailConfigured, platformMailDomain, sendMail } from "@/lib/mail/mailgun";
import { platformBrand, supportReplyMail, supportTeamMail } from "@/lib/mail/templates";
import { createRateLimiter } from "@/lib/rate-limit";
import { apexUrl } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Attachment, SupportCategory, SupportStatus } from "./rules";

const userLimit = createRateLimiter({ limit: 5, windowMs: 3_600_000 });
const ipLimit = createRateLimiter({ limit: 10, windowMs: 3_600_000 });
const messageLimit = createRateLimiter({ limit: 30, windowMs: 3_600_000 });

export type Requester = { userId: string; name: string; email: string; tenantId: string; tenantName: string; planId: string | null; canSeeAll: boolean };

/** The signed-in person with the shop the dashboard currently shows. */
export async function supportRequester(): Promise<Requester | null> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return null;
  const { data } = await createAdminClient().from("tenants").select("plan_id").eq("id", tenant.id).maybeSingle();
  return { userId: user.id, name: user.name, email: user.email, tenantId: tenant.id, tenantName: tenant.name, planId: data?.plan_id ?? null, canSeeAll: roleAtLeast(tenant.role, "admin") };
}

export type TicketRow = { id: string; number: number; subject: string; category: string; status: SupportStatus; last_message_at: string; created_at: string; user_name: string | null; user_email: string };
export type MessageRow = { id: string; author: "customer" | "staff"; body: string; attachment_path: string | null; attachment_name: string | null; created_at: string };

/** Tickets of the current shop the person may see (own ones; owners and admins all of the shop). */
export async function listTickets(req: Requester): Promise<TicketRow[]> {
  let q = createAdminClient()
    .from("support_tickets")
    .select("id, number, subject, category, status, last_message_at, created_at, user_name, user_email")
    .eq("tenant_id", req.tenantId)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (!req.canSeeAll) q = q.eq("user_id", req.userId);
  return ((await q).data ?? []) as TicketRow[];
}

/** One ticket with its thread, read as the signed-in person (RLS decides). */
export async function loadTicket(id: string): Promise<{ ticket: TicketRow & { tenant_id: string | null }; messages: MessageRow[] } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await createClient();
  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, number, subject, category, status, last_message_at, created_at, user_name, user_email, tenant_id")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return null;
  const { data: messages } = await db.from("support_messages").select("id, author, body, attachment_path, attachment_name, created_at").eq("ticket_id", id).order("created_at");
  return { ticket: ticket as TicketRow & { tenant_id: string | null }, messages: (messages ?? []) as MessageRow[] };
}

async function clientIp(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

const staffUrl = (id: string) => `${apexUrl()}/login?next=${encodeURIComponent(`/admin/support/${id}`)}`;
const customerUrl = (id: string) => `${apexUrl()}/dashboard/support/${id}`;
const from = () => `Sellycat Support <support@${platformMailDomain()}>`;

/** Mail to the chosen staff members and the extra address (fallback: SUPPORT_EMAIL). */
async function notifyTeam(input: Omit<Parameters<typeof supportTeamMail>[0], "brand">, replyTo: string) {
  if (!mailConfigured()) return;
  const admin = createAdminClient();
  const { data: s } = await admin.from("platform_settings").select("support_notify_email, support_notify_staff_ids").maybeSingle();
  const to = new Set<string>();
  if (s?.support_notify_email) to.add(s.support_notify_email);
  for (const id of s?.support_notify_staff_ids ?? []) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) to.add(data.user.email);
  }
  if (!to.size && process.env.SUPPORT_EMAIL) to.add(process.env.SUPPORT_EMAIL);
  const mail = supportTeamMail({ ...input, brand: platformBrand("de", apexUrl()) });
  await Promise.all(
    [...to].map((addr) =>
      sendMail({ domain: platformMailDomain(), from: from(), to: addr, replyTo, subject: mail.subject, html: mail.html, text: mail.text, tag: "support-team" }).catch((e) =>
        console.error("[support] team mail", e),
      ),
    ),
  );
}

export type NewTicket = { subject: string; category: SupportCategory; body: string; locale: "de" | "en"; attachment: Attachment | null };

export async function createTicket(req: Requester, input: NewTicket): Promise<{ ok: true; id: string } | { ok: false; error: "limit" | "failed" }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", req.userId).gte("created_at", since);
  if ((count ?? 0) >= 5 || !userLimit.check(req.userId).ok || !ipLimit.check(await clientIp()).ok) return { ok: false, error: "limit" };
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({ tenant_id: req.tenantId, user_id: req.userId, user_name: req.name || null, user_email: req.email, tenant_name: req.tenantName, plan_id: req.planId, locale: input.locale, subject: input.subject, category: input.category })
    .select("id, number")
    .single();
  if (error || !ticket) return { ok: false, error: "failed" };
  await admin.from("support_messages").insert({
    ticket_id: ticket.id,
    tenant_id: req.tenantId,
    author: "customer",
    author_user_id: req.userId,
    body: input.body,
    attachment_path: input.attachment?.path ?? null,
    attachment_name: input.attachment?.name ?? null,
    attachment_bytes: input.attachment?.bytes ?? null,
  });
  await notifyTeam(
    { number: ticket.number, subject: input.subject, reply: false, name: req.name || req.email, email: req.email, shop: req.tenantName, plan: req.planId ?? "–", category: input.category, message: input.body, url: staffUrl(ticket.id) },
    req.email,
  );
  return { ok: true, id: ticket.id };
}

/** A follow-up from the customer side; reopens a finished ticket. */
export async function addCustomerMessage(userId: string, ticketId: string, body: string, attachment: Attachment | null): Promise<boolean> {
  const found = await loadTicket(ticketId);
  if (!found || !messageLimit.check(userId).ok) return false;
  const user = await getSessionUser();
  const t = found.ticket;
  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").insert({
    ticket_id: t.id,
    tenant_id: t.tenant_id,
    author: "customer",
    author_user_id: userId,
    body,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_bytes: attachment?.bytes ?? null,
  });
  if (error) return false;
  const now = new Date().toISOString();
  await admin.from("support_tickets").update({ status: t.status === "done" ? "in_progress" : t.status, last_message_at: now }).eq("id", t.id);
  const { data: info } = await admin.from("support_tickets").select("tenant_name, plan_id, category").eq("id", t.id).single();
  await notifyTeam(
    { number: t.number, subject: t.subject, reply: true, name: user?.name || user?.email || t.user_email, email: user?.email ?? t.user_email, shop: info?.tenant_name ?? "", plan: info?.plan_id ?? "–", category: info?.category ?? "", message: body, url: staffUrl(t.id) },
    user?.email ?? t.user_email,
  );
  return true;
}

/** Staff answer: stored in the thread, mailed to the person who asked (in their language). Callers check staff. */
export async function staffReply(staffId: string, ticketId: string, body: string, close: boolean): Promise<{ ok: boolean; mailed: boolean }> {
  const admin = createAdminClient();
  const { data: t } = await admin.from("support_tickets").select("id, number, subject, user_email, user_name, tenant_id, locale").eq("id", ticketId).maybeSingle();
  if (!t) return { ok: false, mailed: false };
  const { error } = await admin.from("support_messages").insert({ ticket_id: t.id, tenant_id: t.tenant_id, author: "staff", author_user_id: staffId, body });
  if (error) return { ok: false, mailed: false };
  await admin.from("support_tickets").update({ status: close ? "done" : "in_progress", last_message_at: new Date().toISOString() }).eq("id", t.id);
  const locale = t.locale === "en" ? "en" : "de";
  const mail = supportReplyMail({ brand: platformBrand(locale, apexUrl()), number: t.number, subject: t.subject, name: (t.user_name ?? "").split(" ")[0], message: body, url: customerUrl(t.id) });
  const sent = await sendMail({ domain: platformMailDomain(), from: from(), to: t.user_email, subject: mail.subject, html: mail.html, text: mail.text, tag: "support-reply" }).catch(() => ({ ok: false }));
  return { ok: true, mailed: Boolean(sent.ok) };
}

/** Signed upload URL for an attachment in the person's own folder. */
export async function attachmentUpload(userId: string, ext: string): Promise<{ path: string; signedUrl: string } | null> {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { data } = await createAdminClient().storage.from("support").createSignedUploadUrl(path);
  return data ? { path, signedUrl: data.signedUrl } : null;
}

/** Short-lived link to an attachment, only if the person may see its ticket (RLS). */
export async function attachmentLink(path: string): Promise<string | null> {
  const db = await createClient();
  const { data } = await db.from("support_messages").select("id").eq("attachment_path", path).limit(1).maybeSingle();
  if (!data) return null;
  const { data: signed } = await createAdminClient().storage.from("support").createSignedUrl(path, 600);
  return signed?.signedUrl ?? null;
}
