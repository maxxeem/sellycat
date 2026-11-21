import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { googleEnabled } from "@/lib/auth/providers";
import { fromParams } from "@/lib/i18n/params";
import { getStaffUser } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "./profile-view";

export const metadata = { title: "Profil" };

/** Own profile: name, language and look, sign-in methods (password, Google), delete account. */
export default async function ProfilePage({ params }: PageProps<"/p/[locale]/dashboard/profile">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.account.profileTitle} description={t.account.profileIntro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");
  const [google, staff, { count }] = await Promise.all([
    googleEnabled(),
    getStaffUser(),
    createAdminClient().from("tenant_members").select("tenant_id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "owner"),
  ]);
  const identities = (user.identities ?? []).map((i) => ({ id: i.identity_id, provider: i.provider, email: (i.identity_data?.email as string | undefined) ?? null }));
  const meta = user.user_metadata as { full_name?: string; name?: string };
  return (
    <ProfileView
      name={meta.full_name ?? meta.name ?? ""}
      email={user.email ?? ""}
      identities={identities}
      googleAvailable={google}
      blockDelete={staff ? "staff" : (count ?? 0) > 0 ? "owner" : null}
    />
  );
}
