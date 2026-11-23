"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { importDealFromUrl, type ImportResult } from "../actions";

/** "Mit KI aus Link übernehmen": a draft from a product page, applied to the form (not saved). */
export function AiImport({ onDraft }: { onDraft: (draft: Extract<ImportResult, { ok: true }>) => void }) {
  const { t } = useI18n();
  const a = t.deals.aiImport;
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [seconds, setSeconds] = useState(0);
  // Sites that let no robot in: the customer copies the page text from the browser instead.
  const [pasteOffer, setPasteOffer] = useState(false);
  const [pasted, setPasted] = useState("");
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  const run = (text?: string) => {
    setSeconds(0);
    start(async () => {
      setMessage(null);
      let r: ImportResult | undefined;
      // A dropped connection is retried once; a new Sellycat version needs a reload.
      for (let attempt = 0; attempt < 2 && !r; attempt++) {
        try {
          r = await importDealFromUrl(url, text);
        } catch (e) {
          const text = e instanceof Error ? e.message : "";
          if (/Server Action|was not found|older or newer deployment/i.test(text)) return setMessage({ tone: "error", text: a.errors.outdated });
          if (attempt === 1) return setMessage({ tone: "error", text: a.errors.connection });
        }
      }
      if (!r) return setMessage({ tone: "error", text: a.errors.connection });
      if (!r.ok) {
        if (["blocked", "unreachable", "nothing"].includes(r.error)) setPasteOffer(true);
        return setMessage({ tone: "error", text: a.errors[r.error] });
      }
      setPasteOffer(false);
      setPasted("");
      onDraft(r);
      setMessage(r.basic ? { tone: "info", text: fmt(a.basic, { images: String(r.images.length) }) } : { tone: "success", text: fmt(a.done, { images: String(r.images.length) }) });
    });
  };
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
      {pending ? <p className="text-xs text-muted" aria-live="polite">{fmt(a.working, { seconds: String(seconds) })}</p> : <p className="text-xs text-muted">{a.replaceHint}</p>}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {pasteOffer && !pending ? (
        <div className="flex flex-col gap-2" data-testid="ai-import-paste">
          <p className="text-xs text-muted">{a.pasteHint}</p>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={6} maxLength={60_000} placeholder={a.pastePlaceholder} className={inputClass} />
          <button type="button" disabled={pasted.trim().length < 40} className={`${buttonClass.secondary} self-start`} onClick={() => run(pasted)}>
            <Sparkles className="h-4 w-4" aria-hidden /> {a.pasteStart}
          </button>
        </div>
      ) : null}
    </div>
  );
}
