import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { feeLines, isMonth } from "@/lib/billing/fees";
import { csvDate, csvMoney, toCsv } from "@/lib/dashboard/csv";

/** Fee overview of one month as CSV for the accounting (owners and admins). */
export async function GET(_request: Request, ctx: RouteContext<"/api/dashboard/fees/[month]/csv">) {
  const tenant = await getCurrentTenant();
  const { month } = await ctx.params;
  if (!tenant || !roleAtLeast(tenant.role, "admin") || !isMonth(month)) return new Response("Not found", { status: 404 });
  const lines = await feeLines(tenant.id, month);
  const csv = toCsv([
    ["Datum", "Bestellung", "Währung", "Betrag", "Erstattet", "Gebühr", "Netto-Gebühr"],
    ...lines.map((l) => [csvDate(l.paid_at), l.number, l.currency, csvMoney(l.amount_cents), csvMoney(l.refunded_cents), csvMoney(l.fee_cents), csvMoney(l.net_fee_cents)]),
  ]);
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sellycat-gebuehren-${month}.csv"`, "cache-control": "private, no-store" } });
}
