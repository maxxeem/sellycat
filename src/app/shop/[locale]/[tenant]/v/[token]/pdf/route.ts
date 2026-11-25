import { fileAccess } from "@/lib/vouchers/file-key";
import { pdfResponse } from "@/lib/vouchers/pdf-response";

/** One voucher as PDF; opened with the key from our own links, an unlocked device or the shop's team. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; token: string }> }) {
  const { tenant, token } = await params;
  if (!/^[\w-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const denied = await fileAccess(tenant, token, request);
  if (denied) return denied;
  return pdfResponse(tenant, { token }, request);
}
