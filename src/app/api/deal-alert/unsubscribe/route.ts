import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/alerts/deal-alert";

/** One-click unsubscribe of mail programs (List-Unsubscribe-Post, RFC 8058); same answer for any token. */
export async function POST(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get("t") ?? "");
  return NextResponse.json({ ok: true });
}

/** Opened in a browser: to the shop's page, which asks before unsubscribing (scanners only GET). */
export function GET(request: Request) {
  const token = (new URL(request.url).searchParams.get("t") ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  return new Response(null, { status: 302, headers: { Location: `/alert/off/${token}` } });
}
