"use client";

import { useActionState, useTransition } from "react";
import { Notice, Select, buttonClass } from "@/components/ui";
import { WAITLIST_STATUSES, type WaitlistStatus } from "@/lib/access/rules";
import { useI18n } from "@/lib/i18n/context";
import { saveWaitlistNoteAction, setWaitlistStatusAction } from "../../actions";

export function NoteForm({ id, note, canEdit }: { id: string; note: string; canEdit: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveWaitlistNoteAction.bind(null, id), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea name="note" rows={5} maxLength={2000} defaultValue={note} disabled={!canEdit} aria-label={t.staff.access.waitlist.note} className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm" />
      {state ? <Notice tone={state.ok ? "success" : "error"}>{state.ok ? t.staff.access.saved : t.common.error}</Notice> : null}
      {canEdit ? (
        <button type="submit" disabled={pending} className={`${buttonClass.secondary} self-start`}>
          {t.staff.access.waitlist.saveNote}
        </button>
      ) : null}
    </form>
  );
}

export function StatusSelect({ id, status }: { id: string; status: WaitlistStatus }) {
  const { t } = useI18n();
  const w = t.staff.access.waitlist;
  const [pending, start] = useTransition();
  return (
    <Select value={status} disabled={pending} onChange={(e) => start(() => setWaitlistStatusAction([id], e.target.value))} aria-label={w.setStatus}>
      {WAITLIST_STATUSES.map((s) => (
        <option key={s} value={s}>
          {w.statuses[s]}
        </option>
      ))}
    </Select>
  );
}
