import { NextResponse } from "next/server";
import { deliverDue } from "@/lib/mail/deliver";

export const maxDuration = 300;

/**
 * Daily in the morning (Vercel Cron with `CRON_SECRET`): gift mails scheduled for today, and
 * buyer mails that failed earlier (normally they go out right after payment).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await deliverDue()) });
}
