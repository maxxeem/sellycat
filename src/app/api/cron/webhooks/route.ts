import { NextResponse } from "next/server";
import { flushWebhooks } from "@/lib/developers/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Daily (Vercel Cron with `CRON_SECRET`): webhook deliveries that are still due (normally they go
 * out right after the change, retries also with the next change of the shop), then events older
 * than 30 days are removed.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let sent = 0;
  let failed = 0;
  for (let round = 0; round < 20; round++) {
    const r = await flushWebhooks({ limit: 50 });
    sent += r.sent;
    failed += r.failed;
    if (r.sent + r.failed < 50) break;
  }
  const { data: pruned } = await createAdminClient().rpc("webhook_prune");
  return NextResponse.json({ ok: true, sent, failed, pruned });
}
