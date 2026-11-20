import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { settlementPdf } from "@/lib/settlements/settlements";

/** Statement as PDF (owners and admins of the current shop; RLS reads). */
export async function GET(_request: Request, ctx: RouteContext<"/api/dashboard/settlements/[id]/pdf">) {
  const tenant = await getCurrentTenant();
  if (!tenant || !roleAtLeast(tenant.role, "admin")) return new Response("Not found", { status: 404 });
  const r = await settlementPdf(tenant.id, (await ctx.params).id);
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${r.filename}"`, "cache-control": "private, no-store" },
  });
}
