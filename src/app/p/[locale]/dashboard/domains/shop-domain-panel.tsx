"use client";

import { ExternalLink, RefreshCw, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Badge, Notice, buttonClass, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { DNS_PROVIDERS, parseCustomDomain, type DnsProvider, type DnsRow } from "@/lib/site/custom-domain";
import { CopyButton } from "./mail-domain-panel";
import { addDomain, checkDomain, makePrimary, removeDomain, type ShopDomainResult } from "./shop-domain-actions";

export type ShopDomainView = {
  hostname: string;
  apex: string;
  status: "pending" | "dns_ok" | "active" | "error";
  isPrimary: boolean;
  records: DnsRow[];
  provider: DnsProvider | null;
  checkedAt: string | null;
};

type Props = { root: string; sellycatHost: string; sellycatPrimary: boolean; planAllows: boolean; domains: ShopDomainView[] };

const POLL_MS = 20_000;
const POLL_MAX = 30;

function ProviderGuide({ provider }: { provider: DnsProvider | null }) {
  const { t } = useI18n();
  const g = t.shopDomain;
  const [active, setActive] = useState<DnsProvider>(provider ?? "godaddy");
  return (
    <div className="rounded-input border border-line p-4">
      <p className="mb-3 text-sm font-semibold">{g.providerTitle}</p>
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {DNS_PROVIDERS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active === p}
            onClick={() => setActive(p)}
            className={`rounded-input px-2.5 py-1 text-xs font-semibold ${active === p ? "bg-ink text-surface-2" : "bg-surface text-muted hover:text-ink"}`}
          >
            {g.providers[p].name}
            {provider === p ? ` · ${g.detected}` : ""}
          </button>
        ))}
      </div>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
        {g.providers[active].steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function DomainCard({ d, run, pending }: { d: ShopDomainView; run: (fn: () => Promise<ShopDomainResult>) => void; pending: boolean }) {
  const { t, locale } = useI18n();
  const g = t.shopDomain;
  const tone = d.status === "active" ? "green" : d.status === "error" ? "red" : "amber";
  return (
    <div className="flex flex-col gap-4 rounded-input border border-line p-4" data-testid="shop-domain">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={`https://${d.hostname}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono text-base font-semibold hover:underline">
          {d.hostname} <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <span className="flex gap-1.5">
          {d.isPrimary ? <Badge tone="green">{g.primary}</Badge> : null}
          <Badge tone={tone}>{g.status[d.status]}</Badge>
        </span>
      </div>

      {d.status !== "active" ? (
        <>
          <div className="rounded-input bg-surface p-4 text-sm">
            <p className="mb-2 font-semibold">{g.stepsTitle}</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5">
              <li>{fmt(g.step1, { apex: d.apex })}</li>
              <li>{g.step2}</li>
              <li>{g.step3}</li>
            </ol>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">{g.records}</p>
            <ul className="flex flex-col gap-2">
              {d.records.map((r, i) => (
                <li key={i} className="grid gap-1 rounded-input border border-line p-3 text-sm sm:grid-cols-[6rem_1fr]" data-testid="shop-dns-record">
                  <span className="text-muted">{g.type}</span>
                  <span className="flex items-center gap-2">
                    <Badge>{r.type}</Badge>
                    <span className="text-xs text-muted">{g.purpose[r.purpose]}</span>
                  </span>
                  <span className="text-muted">{g.name}</span>
                  <span className="flex min-w-0 items-start justify-between gap-2">
                    <code className="break-all font-mono">{r.name}</code>
                    <CopyButton value={r.name} />
                  </span>
                  <span className="text-muted">{g.value}</span>
                  <span className="flex min-w-0 items-start justify-between gap-2">
                    <code className="break-all font-mono">{r.value}</code>
                    <CopyButton value={r.value} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <ProviderGuide provider={d.provider} />
          <p className="text-xs text-muted">{g.checking}</p>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {d.status === "active" && !d.isPrimary ? (
          <button type="button" disabled={pending} onClick={() => run(() => makePrimary(d.hostname))} className={buttonClass.primary} data-testid="domain-primary">
            <Star className="h-4 w-4" aria-hidden /> {g.makePrimary}
          </button>
        ) : null}
        <button type="button" disabled={pending} onClick={() => run(() => checkDomain(d.hostname))} className={buttonClass.secondary}>
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden /> {g.check}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(fmt(g.removeConfirm, { domain: d.hostname }))) run(() => removeDomain(d.hostname));
          }}
          className={buttonClass.danger}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> {g.remove}
        </button>
        {d.checkedAt ? (
          <span className="ml-auto text-xs text-muted">
            {fmt(g.lastChecked, { time: new Date(d.checkedAt).toLocaleString(locale === "de" ? "de-CH" : "en-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }) })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ShopDomainPanel({ root, sellycatHost, sellycatPrimary, planAllows, domains }: Props) {
  const { t } = useI18n();
  const g = t.shopDomain;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [www, setWww] = useState(true);
  const polls = useRef(0);
  const parsed = draft.trim() ? parseCustomDomain(draft, root) : null;
  const apex = parsed?.ok && !parsed.domain.sub ? parsed.domain.host : null;

  const run = (fn: () => Promise<ShopDomainResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(g.errors[r.error]);
      router.refresh();
    });

  // While a domain waits for DNS or its certificate, check it again every 20 seconds.
  const waiting = domains.filter((d) => d.status !== "active").map((d) => d.hostname);
  const waitingKey = waiting.join(",");
  useEffect(() => {
    if (!waitingKey) return;
    const id = setInterval(() => {
      if (polls.current >= POLL_MAX || document.hidden) return;
      polls.current += 1;
      void Promise.all(waitingKey.split(",").map((h) => checkDomain(h))).then(() => router.refresh());
    }, POLL_MS);
    return () => clearInterval(id);
  }, [waitingKey, router]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-line p-4">
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{g.sellycatAddress}</span>
          <a href={`https://${sellycatHost}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all font-mono text-sm font-semibold hover:underline">
            {sellycatHost} <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </a>
        </span>
        {sellycatPrimary ? (
          <Badge tone="green">{g.primary}</Badge>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => makePrimary(sellycatHost))} className={buttonClass.secondary}>
            <Star className="h-4 w-4" aria-hidden /> {g.makePrimary}
          </button>
        )}
      </div>

      {domains.map((d) => (
        <DomainCard key={d.hostname} d={d} run={run} pending={pending} />
      ))}
      {domains.length > 1 || domains.some((d) => d.status === "active") ? <p className="text-xs text-muted">{g.primaryHint}</p> : null}

      {!planAllows ? (
        <Notice>{g.notOnPlan}</Notice>
      ) : domains.length >= 3 ? (
        <Notice>{g.limit}</Notice>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const r = await addDomain(draft, www);
              if (r.ok) setDraft("");
              else setError(g.errors[r.error]);
              router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{g.domain}</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={g.placeholder} className={`${inputClass} font-mono`} autoCapitalize="none" spellCheck={false} data-testid="shop-domain-input" />
            <span className="text-xs text-muted">{g.hint}</span>
          </label>
          {parsed && !parsed.ok ? <p className="text-sm text-danger">{g.errors[parsed.error]}</p> : null}
          {apex ? (
            <>
              <Notice tone="warning">{fmt(g.apexWarning, { domain: apex })}</Notice>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={www} onChange={(e) => setWww(e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" />
                {fmt(g.www, { domain: apex })}
              </label>
            </>
          ) : null}
          <div>
            <button type="submit" disabled={pending || !parsed?.ok} className={buttonClass.primary} data-testid="shop-domain-add">
              {pending ? "…" : g.add}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
