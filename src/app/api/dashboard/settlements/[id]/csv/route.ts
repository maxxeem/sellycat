import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { csvDate, csvMoney, toCsv } from "@/lib/dashboard/csv";
import { loadSettlement } from "@/lib/settlements/settlements";

/** Statement lines as CSV for the accounting (owners and admins). */
export async function GET(_request: Request, ctx: RouteContext<"/api/dashboard/settlements/[id]/csv">) {
  const tenant = await getCurrentTenant();
  if (!tenant || !roleAtLeast(tenant.role, "admin")) return new Response("Not found", { status: 404 });
  const found = await loadSettlement(tenant.id, (await ctx.params).id);
  if (!found) return new Response("Not found", { status: 404 });
  const { s, lines } = found;
  const kind = { sale: "Verkauf", redemption: "Einlösung", correction: "Korrektur" } as const;
  const csv = toCsv([
    ["Abrechnung", "Partner", "Datum", "Deal", "Code", "Art", "Bezahlt", "Provision", "Auszahlung", "Währung"],
    ...lines.map((l) => [s.number ?? "Entwurf", s.partner.name ?? "", csvDate(l.occurred_at), l.deal_title, l.code, kind[l.kind], csvMoney(l.base_cents), csvMoney(l.commission_cents), csvMoney(l.payout_cents), s.currency]),
  ]);
  const name = `abrechnung-${s.number ?? "entwurf"}.csv`;
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "private, no-store" } });
}
