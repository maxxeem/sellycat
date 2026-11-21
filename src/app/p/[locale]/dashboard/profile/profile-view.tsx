"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, Field, Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount, saveName, savePassword, type ProfileResult } from "./actions";

type Identity = { id: string; provider: string; email: string | null };

/** Profile cards: personal details, language and look, sign-in methods, delete account. */
export function ProfileView({ name, email, identities, googleAvailable, blockDelete }: { name: string; email: string; identities: Identity[]; googleAvailable: boolean; blockDelete: "owner" | "staff" | null }) {
  const { t } = useI18n();
  const a = t.account;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ card: string; tone: "success" | "error"; text: string } | null>(null);
  const [fullName, setFullName] = useState(name);
  const [pw, setPw] = useState({ next: "", repeat: "" });
  const [confirm, setConfirm] = useState("");

  const google = identities.find((i) => i.provider === "google");
  const hasPassword = identities.some((i) => i.provider === "email");
  const errorText = (r: ProfileResult) => (r.ok ? "" : a.errors[r.error]);
  const run = (card: string, fn: () => Promise<ProfileResult>, success: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ card, tone: r.ok ? "success" : "error", text: r.ok ? success : errorText(r) });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  const note = (card: string) => (msg?.card === card ? <Notice tone={msg.tone}>{msg.text}</Notice> : null);

  const linkGoogle = () =>
    start(async () => {
      const { error } = await createClient().auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/continue?next=/dashboard/profile` } });
      if (error) setMsg({ card: "login", tone: "error", text: a.errors.link });
    });
  const unlinkGoogle = () =>
    start(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUserIdentities();
      const identity = data?.identities.find((i) => i.provider === "google");
      const { error } = identity ? await supabase.auth.unlinkIdentity(identity) : { error: new Error("none") };
      setMsg({ card: "login", tone: error ? "error" : "success", text: error ? a.errors.unlink : a.googleRemoved });
      if (!error) router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={a.personal}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run("personal", () => saveName(fullName), a.saved);
          }}
        >
          <Field label={a.name}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required autoComplete="name" />
          </Field>
          <Field label={t.common.email} hint={a.emailHint}>
            <Input value={email} readOnly disabled />
          </Field>
          {note("personal")}
          <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`}>
            {a.save}
          </button>
        </form>
      </Card>

      <Card title={a.preferences}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{t.common.language}</p>
              <p className="text-xs text-muted">{a.languageHint}</p>
            </div>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{a.theme}</p>
              <p className="text-xs text-muted">{a.themeHint}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </Card>

      <Card title={a.signIn} description={a.signInIntro}>
        <div className="flex flex-col gap-5">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run("password", () => savePassword(pw.next, pw.repeat), a.passwordSaved, () => setPw({ next: "", repeat: "" }));
            }}
          >
            <p className="text-sm font-semibold">{hasPassword ? a.changePassword : a.setPassword}</p>
            <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder={a.newPassword} minLength={10} required autoComplete="new-password" />
            <Input type="password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} placeholder={a.repeatPassword} minLength={10} required autoComplete="new-password" />
            {note("password")}
            <button type="submit" disabled={pending} className={`${buttonClass.secondary} self-start`}>
              {a.savePassword}
            </button>
          </form>
          {googleAvailable || google ? (
            <div className="flex flex-col gap-3 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Google</p>
                  <p className="truncate text-xs text-muted">{google ? `${a.connected}${google.email ? ` · ${google.email}` : ""}` : a.notConnected}</p>
                </div>
                {google ? (
                  <button type="button" disabled={pending || identities.length < 2} onClick={unlinkGoogle} className={buttonClass.secondary} title={identities.length < 2 ? a.lastMethod : undefined}>
                    {a.disconnect}
                  </button>
                ) : (
                  <button type="button" disabled={pending} onClick={linkGoogle} className={buttonClass.secondary}>
                    {a.connect}
                  </button>
                )}
              </div>
              {google && identities.length < 2 ? <p className="text-xs text-muted">{a.lastMethod}</p> : null}
              {note("login")}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title={a.deleteTitle} description={a.deleteIntro}>
        {blockDelete ? (
          <Notice tone="warning">{blockDelete === "owner" ? a.errors.owner : a.errors.staff}</Notice>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run("delete", () => deleteAccount(confirm), "");
            }}
          >
            <Field label={a.deleteConfirm}>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </Field>
            {note("delete")}
            <button type="submit" disabled={pending || !confirm} className={`${buttonClass.secondary} self-start border-danger text-danger`}>
              {a.deleteButton}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
