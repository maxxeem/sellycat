import { NextResponse, type NextRequest } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const limit = createRateLimiter({ limit: 30, windowMs: 3_600_000 });

/** «War das hilfreich?»: one vote per article and browser (random id in a cookie), comment optional. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { articleId?: unknown; helpful?: unknown; comment?: unknown; locale?: unknown } | null;
  if (!body || typeof body.articleId !== "string" || !/^[0-9a-f-]{36}$/.test(body.articleId) || typeof body.helpful !== "boolean") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const cookie = request.cookies.get("sc_help")?.value;
  const session = cookie && /^[0-9a-f-]{36}$/.test(cookie) ? cookie : crypto.randomUUID();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!limit.check(ip).ok) return NextResponse.json({ error: "limit" }, { status: 429 });
  const comment = typeof body.comment === "string" && body.comment.trim() ? body.comment.trim().slice(0, 1000) : null;
  const { data: article } = await createAdminClient().from("help_articles").select("id").eq("id", body.articleId).eq("status", "published").maybeSingle();
  if (!article) return NextResponse.json({ error: "not found" }, { status: 404 });
  await createAdminClient()
    .from("help_feedback")
    .upsert({ article_id: article.id, helpful: body.helpful, comment, session, locale: body.locale === "en" ? "en" : "de" }, { onConflict: "article_id,session" });
  const res = NextResponse.json({ ok: true });
  if (!cookie) res.cookies.set("sc_help", session, { path: "/api/help", maxAge: 31_536_000, sameSite: "lax", httpOnly: true });
  return res;
}
