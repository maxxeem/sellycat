import { getCurrentTenant, roleAtLeast } from "@/lib/auth/tenants";
import { csvDate, csvMoney, toCsv } from "@/lib/dashboard/csv";
import { shownVoucherStatus, VOUCHER_STATUSES } from "@/lib/dashboard/order-ui";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";

const MAX_ROWS = 20_000;

/**
 * CSV downloads of the current shop (editor and up; reads through RLS):
 * `?kind=vouchers[&status=…&q=…]`, `?kind=redemptions` and (admin) `?kind=deal-alert`.
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
    const query = () => {
      let q1 = supabase
      .from("vouchers")
      .select("code, title, status, value_cents, remaining_cents, valid_until, created_at, redeemed_at, orders!inner(number, email, name, currency)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .order("id");
      if (status) q1 = q1.eq("status", status);
      if (q.includes("@")) q1 = q1.ilike("orders.email", `%${q}%`);
      else if (q) q1 = q1.ilike("code", `%${q.replace(/\s/g, "%")}%`);
      return q1;
    };
    const data = await fetchAll((from, to) => query().range(from, to), MAX_ROWS);
    csv = toCsv([
      ["Code", "Deal", "Status", "Wert", "Restwert", "Währung", "Gültig bis", "Ausgestellt", "Eingelöst", "Bestellung", "E-Mail", "Name"],
      ...data.map((v) => [
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
    const data = await fetchAll((from, to) => supabase
      .from("redemptions")
      .select("created_at, amount_cents, source, undone_at, vouchers(code, title, orders(number, currency)), partner_locations(name)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to), MAX_ROWS);
    csv = toCsv([
      ["Zeit", "Code", "Deal", "Betrag", "Währung", "Ort", "Quelle", "Rückgängig", "Bestellung"],
      ...data.map((r) => [
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
  } else if (kind === "deal-alert") {
    if (!roleAtLeast(tenant.role, "admin")) return new Response("Not found", { status: 404 });
    // Only confirmed addresses (with the proof of consent) leave the system.
    const rows = await fetchAll((from, to) => supabase.from("deal_alert_subscribers").select("email, created_at, confirmed_at").eq("tenant_id", tenant.id).eq("status", "confirmed").order("created_at").order("id").range(from, to), MAX_ROWS);
    csv = toCsv([["E-Mail", "Angemeldet", "Bestätigt"], ...rows.map((r) => [r.email, csvDate(r.created_at), csvDate(r.confirmed_at)])]);
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
