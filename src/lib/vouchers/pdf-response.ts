import "server-only";
import { loadVouchers, pdfInput, pdfName } from "./data";
import { renderVoucherPdf } from "./pdf";

/** PDF download of the vouchers of an order or of one voucher (access checked by the caller). */
export async function pdfResponse(tenantId: string, by: { orderId: string } | { token: string }, request: Request): Promise<Response> {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const bundle = await loadVouchers(tenantId, by, host);
  if (!bundle) return new Response("Not found", { status: 404 });
  const pdf = await renderVoucherPdf(pdfInput(bundle));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfName(bundle)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
