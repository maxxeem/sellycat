import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Notice, Skeleton, buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { hashToken } from "@/lib/team/team";
import { createAdminClient, createPublicClient } from "@/lib/supabase/admin";
import { AcceptButton, PasswordJoinForm, SignOutButton } from "./forms";

/** Everything reads the token (runtime data), so the whole page streams behind Suspense. */
export default function InvitePage({ params }: PageProps<"/p/[locale]/invite/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="m-auto mt-24 h-64 w-full max-w-md" />}>
      <InviteShell params={params} />
    </Suspense>
  );
}

async function InviteShell({ params }: { params: PageProps<"/p/[locale]/invite/[token]">["params"] }) {
  const { t } = await fromParams(params);
  const { token } = await params;
  return (
    <AuthShell title={t.team.accept.title}>
      <Invite t={t} token={token} />
    </AuthShell>
  );
}

async function Invite({ t, token: raw }: { t: Dictionary; token: string }) {
  const token = decodeURIComponent(raw).slice(0, 100);
  const a = t.team.accept;
  const { data } = await createPublicClient().rpc("invite_preview", { p_token: token });
  const preview = data?.[0];
  if (!preview) return <Notice tone="error">{a.gone}</Notice>;
  if (!preview.open) return <Notice tone={preview.expired ? "error" : "info"}>{preview.expired ? a.gone : a.used}</Notice>;
  const role = t.team.roles[preview.role as keyof typeof t.team.roles] ?? preview.role;
  const intro = <p className="text-sm">{fmt(a.intro, { shop: preview.tenant_name, role })}</p>;

  // Who is invited (server only): the full address, and whether the account was ever used.
  const admin = createAdminClient();
  const { data: invite } = await admin.from("tenant_invites").select("email").eq("token_hash", hashToken(token)).maybeSingle();
  const email = String(invite?.email ?? "");
  const user = await getSessionUser();

  if (user) {
    if ((user.email ?? "").toLowerCase() !== email.toLowerCase())
      return (
        <div className="flex flex-col gap-4">
          {intro}
          <Notice tone="warning">{fmt(a.otherAccount, { email: user.email ?? "" })}</Notice>
          <SignOutButton token={token} label={a.signOut} />
        </div>
      );
    return (
      <div className="flex flex-col gap-4">
        {intro}
        <AcceptButton token={token} />
      </div>
    );
  }

  const { data: userId } = await admin.rpc("auth_user_id", { p_email: email });
  const { data: account } = userId ? await admin.auth.admin.getUserById(userId) : { data: { user: null } };
  const fresh = Boolean(account.user && !account.user.last_sign_in_at);
  return (
    <div className="flex flex-col gap-4">
      {intro}
      <p className="text-xs text-muted">{fmt(a.for, { email: preview.email_masked })}</p>
      {fresh ? (
        <PasswordJoinForm token={token} />
      ) : (
        <>
          <p className="text-sm">{fmt(a.login, { email: preview.email_masked })}</p>
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={buttonClass.primary}>
            {a.loginButton}
          </Link>
        </>
      )}
    </div>
  );
}
