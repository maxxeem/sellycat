import { NextResponse } from "next/server";
import { sendExpiryReminders } from "@/lib/mail/deliver";
import { refreshExpiredPasses } from "@/lib/wallet/passes";

export const maxDuration = 300;

/**
 * Daily (Vercel Cron with `CRON_SECRET`): reminder mails a week before vouchers expire, and the
 * final state for wallet passes of vouchers that just expired.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [reminders, expired] = await Promise.all([sendExpiryReminders(), refreshExpiredPasses()]);
  return NextResponse.json({ ok: true, reminders, expiredPasses: expired });
}
