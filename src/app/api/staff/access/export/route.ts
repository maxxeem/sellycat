import { NextResponse, type NextRequest } from "next/server";
import { codeState, USE_CASES, WAITLIST_STATUSES } from "@/lib/access/rules";
import { searchTerm } from "@/lib/access/staff";
import { csvDate, toCsv } from "@/lib/dashboard/csv";
import { serverEnv } from "@/lib/env";
import { audit, getStaffUser } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";

/** CSV for staff (AAL2): invite codes, their uses, or the waitlist (same filters as the lists). 404 for everyone else. */
export async function GET(request: NextRequest) {
  const staff = await getStaffUser();
  if (!staff || (staff.aal !== "aal2" && !serverEnv.staffMfaOptional)) return new NextResponse(null, { status: 404 });
  const p = request.nextUrl.searchParams;
  const kind = p.get("kind");
  const term = searchTerm(p.get("q") ?? "");
  const db = createAdminClient();
  let rows: (string | number | null)[][];

  if (kind === "codes") {
    let q = db.from("invite_codes").select("code, uses, max_uses, expires_at, disabled_at, plan_id, trial_days, stripe_coupon_id, tag, note, created_at").order("created_at", { ascending: false }).limit(10_000);
    if (term) q = q.or(`code.ilike.*${term}*,note.ilike.*${term}*,tag.ilike.*${term}*`);
    if (p.get("tag")) q = q.eq("tag", p.get("tag")!);
    const { data } = await q;
    rows = [["code", "state", "uses", "max_uses", "expires_at", "plan", "trial_days", "stripe_coupon", "tag", "note", "created_at"]];
    for (const r of data ?? []) rows.push([r.code, codeState(r), r.uses, r.max_uses, csvDate(r.expires_at), r.plan_id, r.trial_days, r.stripe_coupon_id, r.tag, r.note, csvDate(r.created_at)]);
  } else if (kind === "uses") {
    const { data } = await db.from("invite_code_uses").select("email, status, created_at, confirmed_at, released_at, invite_codes(code, tag), tenants(slug)").order("created_at", { ascending: false }).limit(10_000);
    rows = [["code", "tag", "email", "status", "shop", "created_at", "confirmed_at", "released_at"]];
    for (const r of data ?? []) rows.push([r.invite_codes?.code ?? null, r.invite_codes?.tag ?? null, r.email, r.status, r.tenants?.slug ?? null, csvDate(r.created_at), csvDate(r.confirmed_at), csvDate(r.released_at)]);
  } else if (kind === "waitlist") {
    let q = db
      .from("waitlist")
      .select("email, name, company, website, use_case, message, locale, status, created_at, confirmed_at, invited_at, reminded_at, registered_at, staff_note, invite_codes!waitlist_invite_code_id_fkey(code)")
      .order("created_at", { ascending: false })
      .limit(10_000);
    if (term) q = q.or(`email.ilike.*${term}*,name.ilike.*${term}*,company.ilike.*${term}*,message.ilike.*${term}*,staff_note.ilike.*${term}*`);
    const status = p.get("status");
    if (status && (WAITLIST_STATUSES as readonly string[]).includes(status)) q = q.eq("status", status as (typeof WAITLIST_STATUSES)[number]);
    const useCase = p.get("useCase");
    if (useCase && (USE_CASES as readonly string[]).includes(useCase)) q = q.eq("use_case", useCase as (typeof USE_CASES)[number]);
    if (p.get("unconfirmed") !== "1") q = q.not("confirmed_at", "is", null);
    const { data } = await q;
    rows = [["email", "name", "company", "website", "use_case", "message", "locale", "status", "created_at", "confirmed_at", "invited_at", "reminded_at", "registered_at", "invite_code", "staff_note"]];
    for (const r of data ?? [])
      rows.push([r.email, r.name, r.company, r.website, r.use_case, r.message, r.locale, r.status, csvDate(r.created_at), csvDate(r.confirmed_at), csvDate(r.invited_at), csvDate(r.reminded_at), csvDate(r.registered_at), r.invite_codes?.code ?? null, r.staff_note]);
  } else {
    return new NextResponse(null, { status: 404 });
  }

  await audit(staff.id, "access.export", { meta: { kind, rows: rows.length - 1 } });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sellycat-${kind}-${day}.csv"`, "cache-control": "no-store" },
  });
}
