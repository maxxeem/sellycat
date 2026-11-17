import { pdfResponse } from "@/lib/vouchers/pdf-response";

/** One voucher as PDF; the token is the secret from the QR link. */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; token: string }> }) {
  const { tenant, token } = await params;
  if (!/^[\w-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  return pdfResponse(tenant, { token }, request);
}
