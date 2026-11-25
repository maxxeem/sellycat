import { fileAccess } from "@/lib/vouchers/file-key";
import { NextResponse } from "next/server";
import { googleLink } from "@/lib/wallet/passes";

/** Sends the visitor to Google's "save to wallet" page for this voucher (same access as the PDF). */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; token: string }> }) {
  const { tenant, token } = await params;
  if (!/^[\w-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const denied = await fileAccess(tenant, token, request);
  if (denied) return denied;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const url = await googleLink(tenant, token, host);
  if (!url) return new Response("Not found", { status: 404 });
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
