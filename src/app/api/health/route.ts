import { connection } from "next/server";

/** Health probe for monitoring and the launch check: commit, environment, Supabase host (never secrets). */
export async function GET() {
  await connection();
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
  return Response.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: process.env.VERCEL_ENV ?? "development",
    supabase,
  });
}
