"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { importDealFromUrl, type ImportResult } from "../actions";

/** "Mit KI aus Link übernehmen": a draft from a product page, applied to the form (not saved). */
export function AiImport({ onDraft }: { onDraft: (draft: Extract<ImportResult, { ok: true }>) => void }) {
  const { t } = useI18n();
  const a = t.deals.aiImport;
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setMessage(null);
      const r = await importDealFromUrl(url);
      if (!r.ok) return setMessage({ tone: "error", text: a.errors[r.error] });
      onDraft(r);
      setMessage({ tone: "success", text: fmt(a.done, { images: String(r.images.length) }) });
    });
  return (
    <div className="flex flex-col gap-2 rounded-input border border-accent/30 bg-accent/5 p-4" data-testid="ai-import">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-accent-text" aria-hidden /> {a.title}
      </p>
      <p className="text-xs text-muted">{a.hint}</p>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) run();
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={a.placeholder} inputMode="url" className={inputClass} disabled={pending} data-testid="ai-import-url" />
        <button type="submit" disabled={pending || !url.trim()} className={`${buttonClass.primary} shrink-0`}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} {a.start}
        </button>
      </form>
      {pending ? <p className="text-xs text-muted">{a.working}</p> : <p className="text-xs text-muted">{a.replaceHint}</p>}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}
