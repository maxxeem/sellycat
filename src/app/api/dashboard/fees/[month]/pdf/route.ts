import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { renderFeePdf } from "@/lib/billing/fee-pdf";
import { feeLines, isMonth } from "@/lib/billing/fees";
import { createClient } from "@/lib/supabase/server";

/** Fee overview of one month as PDF (owners and admins of the current shop). */
export async function GET(_request: Request, ctx: RouteContext<"/api/dashboard/fees/[month]/pdf">) {
  const tenant = await getCurrentTenant();
  const { month } = await ctx.params;
  if (!tenant || !roleAtLeast(tenant.role, "admin") || !isMonth(month)) return new Response("Not found", { status: 404 });
  const db = await createClient();
  const [{ data: shop }, lines] = await Promise.all([db.from("tenants").select("name, locale, billing").eq("id", tenant.id).single(), feeLines(tenant.id, month)]);
  const locale = shop?.locale === "en" ? "en" : "de";
  const pdf = await renderFeePdf({ shop: { name: shop?.name ?? tenant.name, billing: (shop?.billing ?? {}) as Record<string, string> }, locale, month, lines });
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="sellycat-gebuehren-${month}.pdf"`, "cache-control": "private, no-store" },
  });
}
