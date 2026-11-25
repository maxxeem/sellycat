import { redirect } from "next/navigation";
import { codeRequired } from "@/lib/access/rules";
import { checkCode } from "@/lib/access/server";
import { getSignupMode } from "@/lib/platform/settings";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { WelcomeForm } from "./welcome-form";

/**
 * The form with its checks. `additional` (page /new-shop, shop switcher «Create a new shop»): for an
 * account that already has shops; without shops it falls back to the first-shop wording.
 */
export async function Welcome({ searchParams, additional: wanted = false }: { searchParams: Promise<Record<string, string | string[] | undefined>>; additional?: boolean }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(wanted ? "/login?next=/new-shop" : "/login?next=/welcome");
  const [{ data: mine }, mode, query, { data: staff }] = await Promise.all([supabase.rpc("my_tenants"), getSignupMode(), searchParams, supabase.rpc("is_staff_member")]);
  const additional = wanted && Boolean(mine && mine.length > 0);
  // Room in a plan that includes several shops (Business): no code needed, the shop joins that plan.
  const room = additional ? ((await supabase.rpc("included_shop_room")).data ?? 0) : 0;
  if (mine && mine.length > 0 && !additional) redirect("/dashboard");
  // A code already redeemed by this account (shop not created yet) is not asked for again.
  const { data: held } = await createAdminClient().from("invite_code_uses").select("id").eq("user_id", auth.user.id).eq("status", "confirmed").is("tenant_id", null).limit(1).maybeSingle();
  const raw = typeof query.code === "string" ? query.code : "";
  const initial = raw ? await checkCode(raw) : null;
  const name = typeof auth.user.user_metadata?.full_name === "string" ? auth.user.user_metadata.full_name : "";
  return (
    <WelcomeForm
      email={auth.user.email ?? ""}
      suggestedName={name}
      root={(siteHost() || DEFAULT_ROOT).split(":")[0]}
      needsCode={codeRequired(mode) && staff !== true && room === 0 && !held}
      includedRoom={room}
      initialCode={initial?.ok ? initial.code : ""}
      additional={additional}
    />
  );
}
