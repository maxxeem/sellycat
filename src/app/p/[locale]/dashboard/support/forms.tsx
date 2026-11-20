"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field, Input, Notice, Select, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { ATTACHMENT_MAX, ATTACHMENT_TYPES, SUPPORT_CATEGORIES, type Attachment } from "@/lib/support/rules";
import { replyTicket, submitTicket } from "./actions";

/** Uploads straight into the private bucket through a signed URL; the form only sends the path. */
function useAttachment() {
  const { t } = useI18n();
  const s = t.support;
  const [file, setFile] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    setError(null);
    setFile(null);
    if (!f) return;
    if (!ATTACHMENT_TYPES[f.type]) return setError(s.attachmentType);
    if (f.size > ATTACHMENT_MAX) return setError(s.attachmentTooBig);
    setBusy(true);
    try {
      const res = await fetch("/api/support/attachment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: f.type, size: f.size }) });
      const sign = (await res.json().catch(() => ({}))) as { path?: string; signedUrl?: string };
      if (!res.ok || !sign.path || !sign.signedUrl) return setError(s.attachmentFailed);
      const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "content-type": f.type, "x-upsert": "false" }, body: f });
      if (!put.ok) return setError(s.attachmentFailed);
      setFile({ path: sign.path, name: f.name.slice(0, 120), bytes: f.size });
    } catch {
      setError(s.attachmentFailed);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => setFile(null);
  return { file, busy, error, pick, reset };
}

const accept = Object.keys(ATTACHMENT_TYPES).join(",");
const fileClass = "text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink";

export function NewTicketForm() {
  const { t, locale } = useI18n();
  const s = t.support;
  const router = useRouter();
  const att = useAttachment();
  const [form, setForm] = useState({ subject: "", category: "question", body: "" });
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sentId) {
    return (
      <Notice tone="success">
        {s.sent}{" "}
        <button type="button" className="font-semibold underline" onClick={() => router.push(`/dashboard/support/${sentId}`)}>
          {s.open} →
        </button>
      </Notice>
    );
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await submitTicket({ ...form, locale, attachment: att.file });
          if (r.ok) {
            setSentId(r.id ?? null);
            router.refresh();
          } else setError(s.errors[r.error]);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
        <Field label={s.subject}>
          <Input required maxLength={200} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>
        <Field label={s.category}>
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{s.categories[c]}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={s.message} hint={s.messageHint}>
        <textarea required rows={7} maxLength={10000} className={`${inputClass} h-auto py-3`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </Field>
      <Field label={s.attachment} error={att.error ?? undefined}>
        <input type="file" accept={accept} className={fileClass} onChange={(e) => void att.pick(e.target.files?.[0])} />
      </Field>
      {att.busy ? <p className="text-sm text-muted">{s.uploading}</p> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div>
        <button type="submit" disabled={pending || att.busy} className={buttonClass.primary}>
          {pending ? s.sending : s.send}
        </button>
      </div>
    </form>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const { t } = useI18n();
  const s = t.support;
  const router = useRouter();
  const att = useAttachment();
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setMsg(null);
          const r = await replyTicket(ticketId, { body, attachment: att.file });
          if (r.ok) {
            setBody("");
            att.reset();
            setMsg({ tone: "success", text: s.replied });
            router.refresh();
          } else setMsg({ tone: "error", text: s.errors[r.error] });
        });
      }}
    >
      <textarea required rows={4} maxLength={10000} placeholder={s.replyPlaceholder} aria-label={s.reply} className={`${inputClass} h-auto py-3`} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept={accept} className={fileClass} aria-label={s.attachment} onChange={(e) => void att.pick(e.target.files?.[0])} />
        <button type="submit" disabled={pending || att.busy} className={`${buttonClass.primary} ml-auto`}>
          {pending ? s.sending : s.replySend}
        </button>
      </div>
      {att.error ? <Notice tone="error">{att.error}</Notice> : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </form>
  );
}
