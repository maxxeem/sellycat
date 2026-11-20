"use client";

import { useState, useTransition } from "react";
import { Notice, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { SUPPORT_STATUSES } from "@/lib/support/rules";
import { reply, saveNote, saveNotify, setStatus } from "./actions";

export type StaffOption = { id: string; label: string };

export function NotifySettings({ email, staffIds, staff }: { email: string; staffIds: string[]; staff: StaffOption[] }) {
  const { t } = useI18n();
  const s = t.staff.support;
  const [addr, setAddr] = useState(email);
  const [ids, setIds] = useState(staffIds);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveNotify({ email: addr, staffIds: ids });
          setMsg(r.ok ? { tone: "success", text: s.saved } : { tone: "error", text: s.failed });
        });
      }}
    >
      {staff.map((m) => (
        <label key={m.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-[var(--color-coral)]" checked={ids.includes(m.id)} onChange={(e) => setIds(e.target.checked ? [...ids, m.id] : ids.filter((x) => x !== m.id))} />
          {m.label}
        </label>
      ))}
      <label className="flex max-w-sm flex-col gap-1 text-sm">
        {s.notifyEmail}
        <input type="email" className={inputClass} value={addr} onChange={(e) => setAddr(e.target.value)} />
      </label>
      {!ids.length && !addr.trim() ? <p className="text-xs text-muted">{s.notifyNone}</p> : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <div>
        <button type="submit" disabled={pending} className={buttonClass.secondary}>{s.save}</button>
      </div>
    </form>
  );
}

export function TicketTools({ ticketId, status, note }: { ticketId: string; status: string; note: string }) {
  const { t } = useI18n();
  const s = t.staff.support;
  const [text, setText] = useState("");
  const [noteText, setNoteText] = useState(note);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const send = (close: boolean) =>
    start(async () => {
      const r = await reply(ticketId, text, close);
      if (r.ok) setText("");
      setMsg(!r.ok ? { tone: "error", text: s.failed } : { tone: r.mailed ? "success" : "error", text: r.mailed ? s.sent : s.sentNoMail });
    });
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium">
        {s.replyLabel}
        <textarea rows={7} className={`${inputClass} h-auto py-3 font-normal`} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || !text.trim()} className={buttonClass.primary} onClick={() => send(false)}>{s.send}</button>
        <button type="button" disabled={pending || !text.trim()} className={buttonClass.secondary} onClick={() => send(true)}>{s.sendClose}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{s.status}</span>
        {SUPPORT_STATUSES.map((v) => (
          <button
            key={v}
            type="button"
            disabled={pending}
            className={status === v ? buttonClass.primary : buttonClass.secondary}
            onClick={() => start(async () => setMsg((await setStatus(ticketId, v)).ok ? { tone: "success", text: s.saved } : { tone: "error", text: s.failed }))}
          >
            {t.support.statuses[v]}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium">
        {s.note}
        <textarea
          rows={3}
          className={`${inputClass} h-auto py-3 font-normal`}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onBlur={() => noteText !== note && start(async () => setMsg((await saveNote(ticketId, noteText)).ok ? { tone: "success", text: s.saved } : { tone: "error", text: s.failed }))}
        />
      </label>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </div>
  );
}
