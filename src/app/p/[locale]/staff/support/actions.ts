"use server";

import { revalidatePath } from "next/cache";
import { audit, requireStaff } from "@/lib/platform/staff";
import { cleanText, isSupportStatus } from "@/lib/support/rules";
import { staffReply } from "@/lib/support/support";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffResult = { ok: boolean; mailed?: boolean };

const refresh = (id?: string) => {
  revalidatePath("/p/[locale]/staff/support", "page");
  if (id) revalidatePath("/p/[locale]/staff/support/[id]", "page");
};

export async function reply(ticketId: string, body: string, close: boolean): Promise<StaffResult> {
  const staff = await requireStaff();
  const text = cleanText(body, 10_000);
  if (!text) return { ok: false };
  const r = await staffReply(staff.id, ticketId, text, close);
  if (r.ok) await audit(staff.id, "support.reply", { type: "support_ticket", id: ticketId, meta: { close } });
  refresh(ticketId);
  return r;
}

export async function setStatus(ticketId: string, status: string): Promise<StaffResult> {
  const staff = await requireStaff();
  if (!isSupportStatus(status)) return { ok: false };
  const { error } = await createAdminClient().from("support_tickets").update({ status }).eq("id", ticketId);
  if (!error) await audit(staff.id, "support.status", { type: "support_ticket", id: ticketId, meta: { status } });
  refresh(ticketId);
  return { ok: !error };
}

export async function saveNote(ticketId: string, note: string): Promise<StaffResult> {
  await requireStaff();
  const { error } = await createAdminClient().from("support_tickets").update({ internal_note: cleanText(note, 5000) || null }).eq("id", ticketId);
  return { ok: !error };
}

/** Who hears about new requests: chosen staff members and/or one extra address. */
export async function saveNotify(input: { email: string; staffIds: string[] }): Promise<StaffResult> {
  const staff = await requireStaff();
  const email = input.email.trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false };
  const admin = createAdminClient();
  const { data: members } = await admin.from("platform_staff").select("user_id").in("user_id", input.staffIds.filter((id) => /^[0-9a-f-]{36}$/.test(id)));
  const ids = (members ?? []).map((m) => m.user_id);
  const { error } = await admin.from("platform_settings").update({ support_notify_email: email || null, support_notify_staff_ids: ids }).eq("id", true);
  if (!error) await audit(staff.id, "support.notify", { meta: { email, ids } });
  refresh();
  return { ok: !error };
}
