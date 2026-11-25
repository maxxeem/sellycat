"use client";

import { Eye, Loader2, MailCheck, Search, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Field, Input, Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { previewManualAlert, sendManualAlert, testManualAlert, type ManualError } from "./actions";

export type ComposerDeal = { id: string; title: string; partner: string; price: string; image: string | null; sentAt: string | null; skipped: boolean };
const MAX = 10;

/** Deal alert by hand: pick live deals, own subject and message, preview, test mail, send to everyone. */
export function ManualComposer({ deals, recipients, preselect }: { deals: ComposerDeal[]; recipients: number; preselect: string | null }) {
  const { t } = useI18n();
  const m = t.dealAlertAdmin.manual;
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(() => (preselect && deals.some((d) => d.id === preselect) ? [preselect] : []));
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const input = { dealIds: picked, subject, message };
  const fail = (e: ManualError) => setNote({ tone: "error", text: m.errors[e] });
  const changed = () => {
    setPreview(null);
    setNote(null);
  };
  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX ? [...p, id] : p));
    changed();
  };
  const shown = deals.filter((d) => !query.trim() || `${d.title} ${d.partner}`.toLowerCase().includes(query.trim().toLowerCase()));
  const again = deals.filter((d) => picked.includes(d.id) && d.sentAt);

  if (!deals.length) return <p className="text-sm text-muted">{m.noDeals}</p>;
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">{fmt(m.pick, { max: MAX })}</legend>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={m.search} aria-label={m.search} className={`${inputClass} pl-9`} data-testid="manual-search" />
        </label>
        {picked.length ? <p className="text-xs text-muted">{fmt(m.picked, { n: picked.length, deals: picked.map((id) => deals.find((d) => d.id === id)?.title).join(", ") })}</p> : null}
        {!shown.length ? <p className="py-4 text-center text-sm text-muted">{t.deals.reuseNoMatch}</p> : null}
        <div className={`${shown.length ? "" : "hidden"} max-h-80 divide-y divide-line overflow-y-auto rounded-input border border-line`}>
          {shown.map((d) => {
            const at = picked.indexOf(d.id);
            return (
              <label key={d.id} className={`flex cursor-pointer items-center gap-3 p-3 text-sm transition hover:bg-surface ${at >= 0 ? "bg-surface" : ""}`} data-testid="manual-deal">
                <input type="checkbox" checked={at >= 0} disabled={at < 0 && picked.length >= MAX} onChange={() => toggle(d.id)} className="h-4 w-4 shrink-0 accent-[var(--coral)]" />
                {d.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image} alt="" className="h-11 w-14 shrink-0 rounded-input border border-line object-cover" loading="lazy" />
                ) : (
                  <span className="h-11 w-14 shrink-0 rounded-input border border-line bg-surface" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{d.title}</span>
                  <span className="block text-xs text-muted">{[d.partner, d.price, d.sentAt ? fmt(m.sentAt, { date: d.sentAt }) : d.skipped ? m.skipped : ""].filter(Boolean).join(" · ")}</span>
                </span>
                {at >= 0 && picked.length > 1 ? <Badge>{at + 1}</Badge> : null}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Field label={m.subject} hint={m.subjectHint}>
        <Input value={subject} maxLength={120} onChange={(e) => { setSubject(e.target.value); changed(); }} data-testid="manual-subject" />
      </Field>
      <Field label={m.message} hint={fmt(m.messageHint, { n: message.length, max: 600 })}>
        <textarea value={message} maxLength={600} rows={3} onChange={(e) => { setMessage(e.target.value); changed(); }} className={inputClass} data-testid="manual-message" />
      </Field>
      {again.length ? <Notice tone="warning">{fmt(m.again, { deals: again.map((d) => d.title).join(", ") })}</Notice> : null}
      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass.secondary}
          disabled={pending || !picked.length}
          data-testid="manual-preview"
          onClick={() => start(async () => {
            const r = await previewManualAlert(input);
            if (r.ok) setPreview(r);
            else fail(r.error);
          })}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />} {m.preview}
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          disabled={pending || !picked.length}
          onClick={() => start(async () => {
            const r = await testManualAlert(input);
            if (r.ok) setNote({ tone: "success", text: fmt(m.testSent, { email: r.email }) });
            else fail(r.error);
          })}
        >
          <MailCheck className="h-4 w-4" aria-hidden /> {m.test}
        </button>
        <button
          type="button"
          className={buttonClass.primary}
          disabled={pending || !picked.length || !recipients}
          data-testid="manual-send"
          onClick={() => {
            if (!window.confirm(fmt(m.confirm, { deals: picked.length, count: recipients }))) return;
            start(async () => {
              const r = await sendManualAlert(input);
              if (!r.ok) return fail(r.error);
              setPicked([]);
              setSubject("");
              setMessage("");
              setPreview(null);
              setNote({ tone: "success", text: fmt(m.done, { count: r.recipients }) });
              router.refresh();
            });
          }}
        >
          <Send className="h-4 w-4" aria-hidden /> {fmt(m.send, { count: recipients })}
        </button>
      </div>
      {!recipients ? <p className="text-xs text-muted">{m.errors.recipients}</p> : null}
      {preview ? (
        <div className="overflow-hidden rounded-input border border-line" data-testid="manual-preview-box">
          <p className="border-b border-line bg-surface px-4 py-2.5 text-sm"><span className="text-muted">{m.subjectLabel}:</span> <strong>{preview.subject}</strong></p>
          <iframe title={m.preview} srcDoc={preview.html} sandbox="" className="h-[640px] w-full bg-white" />
        </div>
      ) : null}
    </div>
  );
}
