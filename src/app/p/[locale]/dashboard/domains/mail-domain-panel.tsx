"use client";

import { CheckCircle2, Copy, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge, Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import type { DnsRecord } from "@/lib/mail/mailgun";
import { addMailDomain, checkMailDomain, removeMailDomain, saveLocalPart, type MailDomainResult } from "./actions";

type Props = {
  sender: { from: string; own: boolean };
  planAllows: boolean;
  domain: { domain: string; localPart: string; status: "pending" | "active" | "error"; records: DnsRecord[]; checkedAt: string | null } | null;
};

function CopyButton({ value }: { value: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden /> {done ? t.mailDomain.copied : t.mailDomain.copy}
    </button>
  );
}

function RecordRow({ r }: { r: DnsRecord }) {
  const { t } = useI18n();
  const m = t.mailDomain;
  return (
    <li className="flex flex-col gap-2 rounded-input border border-line p-3" data-testid="dns-record">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Badge>{r.type}</Badge>
          {r.priority ? <span className="text-xs text-muted">{m.priority} {r.priority}</span> : null}
        </span>
        {r.valid ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> {m.ok}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
            <XCircle className="h-4 w-4" aria-hidden /> {m.missing}
          </span>
        )}
      </div>
      <div className="grid gap-1 text-sm sm:grid-cols-[5rem_1fr]">
        <span className="text-muted">{m.name}</span>
        <span className="flex min-w-0 items-start justify-between gap-2">
          <code className="break-all font-mono">{r.name}</code>
          <CopyButton value={r.name} />
        </span>
        <span className="text-muted">{m.value}</span>
        <span className="flex min-w-0 items-start justify-between gap-2">
          <code className="break-all font-mono">{r.value}</code>
          <CopyButton value={r.value} />
        </span>
      </div>
    </li>
  );
}

export function MailDomainPanel({ sender, planAllows, domain }: Props) {
  const { t } = useI18n();
  const m = t.mailDomain;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [local, setLocal] = useState(domain?.localPart ?? "gutscheine");
  const run = (fn: () => Promise<MailDomainResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(m.errors[r.error]);
    });
  const preview = draft.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const bare = preview && preview.split(".").length === 2;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm">
        <span className="text-muted">{m.current}: </span>
        <span className="font-mono font-semibold" data-testid="current-sender">
          {sender.from}
        </span>{" "}
        <Badge tone={sender.own ? "green" : "neutral"}>{sender.own ? m.viaOwn : m.viaSellycat}</Badge>
      </p>

      {!planAllows ? <Notice>{domain ? m.pausedPlan : m.notOnPlan}</Notice> : null}

      {!domain && planAllows ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addMailDomain(draft, local));
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{m.domain}</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={m.placeholder} className={`${inputClass} font-mono`} autoCapitalize="none" spellCheck={false} data-testid="mail-domain" />
            <span className="text-xs text-muted">{bare ? fmt(m.subdomainTip, { domain: preview }) : m.domainHint}</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{m.localPart}</span>
            <span className="flex items-center gap-2">
              <input value={local} onChange={(e) => setLocal(e.target.value)} className={`${inputClass} w-44 font-mono`} autoCapitalize="none" spellCheck={false} />
              <span className="truncate font-mono text-sm text-muted">@{preview || m.placeholder}</span>
            </span>
          </label>
          <div>
            <button type="submit" disabled={pending || !draft.trim()} className={buttonClass.primary}>
              {pending ? "…" : m.add}
            </button>
          </div>
        </form>
      ) : null}

      {domain ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-base font-semibold">{domain.domain}</p>
            <Badge tone={domain.status === "active" ? "green" : domain.status === "error" ? "red" : "amber"}>{m.status[domain.status]}</Badge>
          </div>

          {domain.status !== "active" ? (
            <div className="rounded-input bg-surface p-4 text-sm">
              <p className="mb-2 font-semibold">{m.stepsTitle}</p>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5">
                <li>{m.step1}</li>
                <li>{m.step2}</li>
                <li>{m.step3}</li>
              </ol>
            </div>
          ) : null}

          <ul className="flex flex-col gap-2">
            {domain.records.filter((r) => r.purpose === "sending").map((r, i) => (
              <RecordRow key={`s${i}`} r={r} />
            ))}
          </ul>
          {domain.records.some((r) => r.purpose === "receiving") ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">{m.optional}</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {domain.records.filter((r) => r.purpose === "receiving").map((r, i) => (
                  <RecordRow key={`r${i}`} r={r} />
                ))}
              </ul>
            </details>
          ) : null}

          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveLocalPart(local));
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{m.localPart}</span>
              <span className="flex items-center gap-2">
                <input value={local} onChange={(e) => setLocal(e.target.value)} className={`${inputClass} w-44 font-mono`} autoCapitalize="none" spellCheck={false} />
                <span className="font-mono text-sm text-muted">@{domain.domain}</span>
              </span>
            </label>
            {local !== domain.localPart ? (
              <button type="submit" disabled={pending} className={buttonClass.secondary}>
                {m.saveAddress}
              </button>
            ) : null}
          </form>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(checkMailDomain)} className={buttonClass.primary} data-testid="mail-domain-check">
              <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden /> {m.check}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm(m.removeConfirm)) run(removeMailDomain);
              }}
              className={buttonClass.danger}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> {m.remove}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
