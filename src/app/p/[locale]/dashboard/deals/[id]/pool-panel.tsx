"use client";

import { FileUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Badge, Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { POOL_MAX_IMPORT, parsePoolCodes, poolLevel } from "@/lib/vouchers/pool";
import { clearPoolCodes, importPoolCodes } from "../actions";

/** Code pool of a deal: counts, warning, import from a file or pasted text, delete free codes. */
export function PoolPanel({ dealId, text, onText: setText, shortage, free, used, saved }: { dealId: string; text: string; onText: (text: string) => void; shortage: string | null; free: number; used: number; saved: boolean }) {
  const { t, locale } = useI18n();
  const p = t.deals.pool;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const parsed = useMemo(() => (text.trim() ? parsePoolCodes(text) : null), [text]);
  const level = poolLevel(free, used);
  const n = (v: number) => v.toLocaleString(locale === "de" ? "de-CH" : "en-CH");

  const onImport = () =>
    start(async () => {
      if (!parsed?.codes.length) return;
      setMessage(null);
      const r = await importPoolCodes(dealId, parsed.codes);
      if (!r.ok) return setMessage({ tone: "error", text: r.error === "tooMany" ? p.tooMany : p.failed });
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      setMessage({ tone: "success", text: [fmt(p.imported, { added: n(r.added ?? 0) }), r.skipped ? fmt(p.skipped, { n: n(r.skipped) }) : ""].filter(Boolean).join(" ") });
      router.refresh();
    });

  const onClear = () => {
    if (!window.confirm(p.clearConfirm)) return;
    start(async () => {
      setMessage(null);
      const r = await clearPoolCodes(dealId);
      setMessage(r.ok ? { tone: "success", text: fmt(p.cleared, { n: n(r.removed ?? 0) }) } : { tone: "error", text: p.failed });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-input border border-line p-4" data-testid="pool-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{p.title}</p>
        <span className="flex gap-1.5">
          <Badge tone={level === "empty" ? "red" : level === "low" ? "amber" : "green"}>{fmt(p.free, { n: n(free) })}</Badge>
          <Badge>{fmt(p.used, { n: n(used) })}</Badge>
        </span>
      </div>
      <p className="text-sm text-muted">{p.intro}</p>
      {!saved ? <Notice>{p.notSaved}</Notice> : null}
      {level === "empty" ? <Notice tone="error">{p.empty}</Notice> : level === "low" ? <Notice tone="warning">{fmt(p.low, { n: n(free) })}</Notice> : null}

      {shortage ? <Notice tone="warning">{shortage}</Notice> : null}

      <label className={`${buttonClass.secondary} cursor-pointer self-start`}>
        <FileUp className="h-4 w-4" aria-hidden /> {p.file}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void f.text().then(setText);
          }}
        />
      </label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={p.paste} className={`${inputClass} font-mono text-sm`} spellCheck={false} data-testid="pool-text" />
      {parsed ? (
        <p className="text-sm">
          <strong>{fmt(p.detected, { n: n(parsed.codes.length) })}</strong>
          {[parsed.duplicates ? fmt(p.duplicates, { n: n(parsed.duplicates) }) : "", parsed.tooLong ? fmt(p.tooLong, { n: n(parsed.tooLong) }) : "", parsed.header ? p.header : ""]
            .filter(Boolean)
            .map((x) => ` · ${x}`)
            .join("")}
        </p>
      ) : null}
      {parsed?.codes.length ? <p className="text-xs text-muted">{p.importHint}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onImport} disabled={pending || !parsed?.codes.length || parsed.codes.length > POOL_MAX_IMPORT} className={buttonClass.primary} data-testid="pool-import">
          {pending ? "…" : p.import}
        </button>
        {free > 0 ? (
          <button type="button" onClick={onClear} disabled={pending} className={buttonClass.danger}>
            <Trash2 className="h-4 w-4" aria-hidden /> {p.clear}
          </button>
        ) : null}
      </div>
      {parsed && parsed.codes.length > POOL_MAX_IMPORT ? <Notice tone="error">{p.tooMany}</Notice> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}
