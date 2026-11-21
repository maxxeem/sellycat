"use client";

import { useState, useTransition } from "react";
import { Badge, Card, Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { TEAM_ROLES, canChangeRole, canInvite, canRemove, seatsLeft, type TeamRole } from "@/lib/team/rules";
import type { TeamInvite, TeamMember } from "@/lib/team/team";
import { invite, remove, resend, revoke, setRole, type TeamResult } from "./actions";

/** Members with roles, open invitations and the invite form (owners/admins). */
export function TeamManager(props: { members: TeamMember[]; invites: TeamInvite[]; seatLimit: number | null; seatsUsed: number; me: string; myRole: string; canManage: boolean }) {
  const { t, locale } = useI18n();
  const s = t.team;
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ email: "", name: "", role: "editor" as TeamRole });
  const owners = props.members.filter((m) => m.role === "owner").length;
  const left = seatsLeft(props.seatLimit, props.seatsUsed);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const run = (fn: () => Promise<TeamResult>, ok: string) =>
    start(async () => {
      setMessage(null);
      const r = await fn();
      if (r.ok) setMessage({ tone: "success", text: r.mailed === false ? s.sentNoMail : ok });
      else setMessage({ tone: "error", text: s.errors[r.error] });
    });

  const invitable = TEAM_ROLES.filter((r) => canInvite(props.myRole, r));
  return (
    <div className="flex flex-col gap-6">
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Card
        title={s.members}
        description={props.seatLimit === null ? fmt(s.seatsUnlimited, { used: props.seatsUsed }) : fmt(s.seats, { used: props.seatsUsed, limit: props.seatLimit })}
      >
        <ul className="flex flex-col divide-y divide-line" data-testid="team-members">
          {props.members.map((m) => {
            const mine = m.userId === props.me;
            const roles = TEAM_ROLES.filter((r) => r === m.role || canChangeRole({ actor: props.myRole, actorId: props.me, targetId: m.userId, from: m.role, to: r, owners }));
            const removable = canRemove({ actor: props.myRole, actorId: props.me, targetId: m.userId, role: m.role, owners });
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                  <p className="truncate font-semibold">
                    {m.name || m.email} {mine ? <Badge tone="coral">{s.you}</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[m.name ? m.email : null, m.lastSignIn ? fmt(s.lastSignIn, { date: date(m.lastSignIn) }) : s.neverSignedIn].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {props.canManage && roles.length > 1 ? (
                  <Select value={m.role} disabled={pending} onChange={(e) => run(() => setRole(m.userId, e.target.value), s.changed)} aria-label={s.role} className="w-40">
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {s.roles[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge>{s.roles[m.role]}</Badge>
                )}
                {removable && (props.canManage || mine) ? (
                  <button
                    type="button"
                    className={`${buttonClass.ghost} text-danger`}
                    disabled={pending}
                    onClick={() => confirm(mine ? s.leaveConfirm : fmt(s.removeConfirm, { name: m.name || m.email })) && run(() => remove(m.userId), s.changed)}
                  >
                    {mine ? s.leave : s.remove}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      {props.invites.length ? (
        <Card title={s.invites}>
          <ul className="flex flex-col divide-y divide-line" data-testid="team-invites">
            {props.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.name || i.email}</p>
                  <p className="truncate text-xs text-muted">{[i.name ? i.email : null, fmt(s.expires, { date: date(i.expiresAt) })].filter(Boolean).join(" · ")}</p>
                </div>
                <Badge>{s.roles[i.role]}</Badge>
                {props.canManage && canInvite(props.myRole, i.role) ? (
                  <>
                    <button type="button" className={buttonClass.ghost} disabled={pending} onClick={() => run(() => resend(i.id), s.resent)}>
                      {s.resend}
                    </button>
                    <button type="button" className={`${buttonClass.ghost} text-danger`} disabled={pending} onClick={() => confirm(s.revokeConfirm) && run(() => revoke(i.id), s.changed)}>
                      {s.revoke}
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {props.canManage ? (
        <Card title={s.inviteTitle}>
          {left < 1 ? (
            <Notice tone="warning">{s.seatsFull}</Notice>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const r = await invite(form);
                  if (r.ok) setForm({ email: "", name: "", role: form.role });
                  return r;
                }, fmt(s.sent, { email: form.email }));
              }}
              data-testid="team-invite"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={s.name}>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} autoComplete="off" />
                </Field>
                <Field label={s.email}>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} autoComplete="off" />
                </Field>
              </div>
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="mb-1 text-sm font-medium">{s.role}</legend>
                {invitable.map((r) => (
                  <label key={r} className={`flex cursor-pointer gap-2 rounded-input border p-3 text-sm ${form.role === r ? "border-ink ring-2 ring-ink" : "border-line"}`}>
                    <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm({ ...form, role: r })} className="mt-0.5" />
                    <span>
                      <span className="font-semibold">{s.roles[r]}</span>
                      <span className="block text-xs text-muted">{s.roleHints[r]}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <div>
                <button type="submit" className={buttonClass.primary} disabled={pending || !form.email}>
                  {pending ? "…" : s.send}
                </button>
              </div>
            </form>
          )}
        </Card>
      ) : (
        <p className="text-sm text-muted">{s.adminOnly}</p>
      )}
    </div>
  );
}
