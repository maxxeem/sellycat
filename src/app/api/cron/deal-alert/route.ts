import { NextResponse } from "next/server";
import { pruneSubscribers, registerWakeUrl, runDealAlerts } from "@/lib/alerts/deal-alert";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/** Daily safety net (Vercel Cron with `CRON_SECRET`): due mails, unconfirmed addresses, wake-up address. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await Promise.all([registerWakeUrl(), pruneSubscribers()]);
  return NextResponse.json({ ok: true, ...(await runDealAlerts()) });
}

/** Wake-up from the database (pg_cron every five minutes when there is work), with a one-time token. */
export async function POST(request: Request) {
  const token = request.headers.get("x-deal-alert-token") ?? "";
  if (!/^[0-9a-f]{48}$/.test(token)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: ok } = await createAdminClient().rpc("deal_alert_tick_claim", { p_token: token });
  if (ok !== true) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runDealAlerts()) });
}
