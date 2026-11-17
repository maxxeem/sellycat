import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { csvDate, csvMoney, toCsv } from "@/lib/dashboard/csv";
import { shownVoucherStatus, VOUCHER_STATUSES } from "@/lib/dashboard/order-ui";
import { createClient } from "@/lib/supabase/server";

const MAX_ROWS = 20_000;

/**
 * CSV downloads of the current shop (editor and up; reads through RLS):
 * `?kind=vouchers[&status=…&q=…]` and `?kind=redemptions`.
 */
export async function GET(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant || !roleAtLeast(tenant.role, "editor")) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });

  let csv: string;
  if (kind === "vouchers") {
    const status = VOUCHER_STATUSES.find((s) => s === params.get("status"));
    const q = (params.get("q") ?? "").replace(/[^\p{L}\p{N}@._+\- ]/gu, "").trim().slice(0, 80);
    let query = supabase
      .from("vouchers")
      .select("code, title, status, value_cents, remaining_cents, valid_until, created_at, redeemed_at, orders!inner(number, email, name, currency)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (status) query = query.eq("status", status);
    if (q.includes("@")) query = query.ilike("orders.email", `%${q}%`);
    else if (q) query = query.ilike("code", `%${q.replace(/\s/g, "%")}%`);
    const { data } = await query;
    csv = toCsv([
      ["Code", "Deal", "Status", "Wert", "Restwert", "Währung", "Gültig bis", "Ausgestellt", "Eingelöst", "Bestellung", "E-Mail", "Name"],
      ...(data ?? []).map((v) => [
        v.code,
        v.title,
        shownVoucherStatus(v),
        csvMoney(v.value_cents),
        csvMoney(v.remaining_cents),
        v.orders.currency,
        csvDate(v.valid_until),
        csvDate(v.created_at),
        csvDate(v.redeemed_at),
        v.orders.number,
        v.orders.email,
        v.orders.name,
      ]),
    ]);
  } else if (kind === "redemptions") {
    const { data } = await supabase
      .from("redemptions")
      .select("created_at, amount_cents, source, undone_at, vouchers(code, title, orders(number, currency)), partner_locations(name)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    csv = toCsv([
      ["Zeit", "Code", "Deal", "Betrag", "Währung", "Ort", "Quelle", "Rückgängig", "Bestellung"],
      ...(data ?? []).map((r) => [
        csvDate(r.created_at),
        r.vouchers?.code,
        r.vouchers?.title,
        csvMoney(r.amount_cents),
        r.vouchers?.orders?.currency,
        r.partner_locations?.name,
        r.source,
        csvDate(r.undone_at),
        r.vouchers?.orders?.number,
      ]),
    ]);
  } else {
    return new Response("Unknown export", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${tenant.slug}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
