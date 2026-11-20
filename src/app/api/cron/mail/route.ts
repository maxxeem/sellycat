import { NextResponse } from "next/server";
import { sendInviteReminders } from "@/lib/access/staff";
import { deliverDue } from "@/lib/mail/deliver";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Daily in the morning (Vercel Cron with `CRON_SECRET`): gift mails scheduled for today, and
 * buyer mails that failed earlier (normally they go out right after payment), waitlist invite
 * reminders, and signup housekeeping (unconfirmed invite slots and waitlist entries).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const delivered = await deliverDue();
  const reminders = await sendInviteReminders();
  const { data: housekeeping } = await createAdminClient().rpc("access_housekeeping", { p_hours: 72 });
  return NextResponse.json({ ok: true, ...delivered, ...reminders, housekeeping });
}
