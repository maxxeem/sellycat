"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { Badge, Card, EmptyState, Field, Input, Notice, buttonClass, linkClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { WEBHOOK_EVENTS } from "@/lib/developers/rules";
import type { ApiKeyRow, DeliveryRow, EndpointRow } from "@/lib/developers/manage";
import { addEndpoint, addKey, changeEndpoint, newSecret, removeEndpoint, removeKey, resendDelivery, showSecret, testEndpoint, type DevResult } from "./actions";

function CopyField({ value, testId }: { value: string; testId?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 break-all rounded-input border border-line bg-surface px-3 py-2 font-mono text-xs" data-testid={testId}>
        {value}
      </code>
      <button
        type="button"
        className={buttonClass.secondary}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? t.developers.copied : t.developers.copy}
      </button>
    </div>
  );
}

/** Dashboard → API & webhooks: keys, endpoints, recent deliveries. */
export function DeveloperConsole(props: { allowed: boolean; keys: ApiKeyRow[]; endpoints: EndpointRow[]; deliveries: DeliveryRow[]; apiBase: string }) {
  const { t, locale } = useI18n();
  const s = t.developers;
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [keyForm, setKeyForm] = useState({ name: "", redeem: false });
  const [hookForm, setHookForm] = useState({ url: "", description: "", events: ["order.paid"] as string[] });
  const [open, setOpen] = useState<string | null>(null);
  const when = (iso: string) => new Date(iso).toLocaleString(locale === "de" ? "de-CH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const endpointUrl = (id: string) => props.endpoints.find((e) => e.id === id)?.url ?? "–";

  const run = (fn: () => Promise<DevResult>, onOk?: (r: Extract<DevResult, { ok: true }>) => string | null) =>
    start(async () => {
      setMessage(null);
      const r = await fn();
      if (r.ok) {
        const text = onOk ? onOk(r) : s.saved;
        if (text) setMessage({ tone: "success", text });
      } else setMessage({ tone: "error", text: s.errors[r.error] });
    });

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="flex flex-col gap-6">
      {!props.allowed ? (
        <Notice tone="warning">
          {s.planMissing}{" "}
          <a href="/dashboard/billing" className={linkClass}>
            {s.planLink}
          </a>
        </Notice>
      ) : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Card title={s.keys.title} description={fmt(s.keys.intro, { base: props.apiBase })}>
        {newKey ? (
          <div className="mb-5 flex flex-col gap-2 rounded-card border border-accent/50 bg-accent/5 p-4">
            <p className="text-sm font-semibold">{s.keys.created}</p>
            <CopyField value={newKey} testId="new-api-key" />
            <p className="text-xs text-muted">{s.keys.onlyOnce}</p>
          </div>
        ) : null}
        {props.keys.length ? (
          <ul className="flex flex-col divide-y divide-line" data-testid="api-keys">
            {props.keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {k.name} {k.revoked_at ? <Badge>{s.keys.revoked}</Badge> : null}
                  </p>
                  <p className="text-xs text-muted">
                    <code className="font-mono">{k.prefix}…</code> · {k.scopes.map((sc) => s.keys.scopes[sc as "read" | "redeem"] ?? sc).join(", ")} · {fmt(s.keys.createdAt, { date: when(k.created_at) })} ·{" "}
                    {k.last_used_at ? fmt(s.keys.lastUsed, { date: when(k.last_used_at) }) : s.keys.neverUsed}
                  </p>
                </div>
                {!k.revoked_at ? (
                  <button type="button" className={buttonClass.danger} disabled={pending} onClick={() => confirm(fmt(s.keys.revokeConfirm, { name: k.name })) && run(() => removeKey(k.id), () => s.keys.revokedOk)}>
                    {s.keys.revoke}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{s.keys.empty}</p>
        )}
        {props.allowed ? (
          <form
            className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => addKey({ name: keyForm.name, scopes: keyForm.redeem ? ["read", "redeem"] : ["read"] }),
                (r) => {
                  setNewKey(r.key ?? null);
                  setKeyForm({ name: "", redeem: false });
                  return null;
                },
              );
            }}
          >
            <div className="flex-1">
              <Field label={s.keys.name}>
                <Input value={keyForm.name} maxLength={80} required placeholder={s.keys.namePlaceholder} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm">
              <input type="checkbox" checked={keyForm.redeem} onChange={(e) => setKeyForm({ ...keyForm, redeem: e.target.checked })} />
              {s.keys.allowRedeem}
            </label>
            <button type="submit" className={buttonClass.primary} disabled={pending}>
              {s.keys.create}
            </button>
          </form>
        ) : null}
      </Card>

      <Card title={s.hooks.title} description={s.hooks.intro}>
        {props.endpoints.length ? (
          <ul className="flex flex-col divide-y divide-line" data-testid="webhook-endpoints">
            {props.endpoints.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-sm font-semibold">{e.url}</p>
                    {e.description ? <p className="text-xs text-muted">{e.description}</p> : null}
                  </div>
                  <Badge tone={e.enabled ? "green" : "neutral"}>{e.enabled ? s.hooks.active : s.hooks.paused}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${e.events.includes(ev) ? "border-ink bg-surface" : "border-line text-muted"}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={e.events.includes(ev)}
                        disabled={pending}
                        onChange={() => run(() => changeEndpoint(e.id, { events: toggle(e.events, ev) }))}
                      />
                      <code className="font-mono">{ev}</code>
                    </label>
                  ))}
                </div>
                {secrets[e.id] ? <CopyField value={secrets[e.id]} testId="webhook-secret" /> : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => run(() => testEndpoint(e.id), (r) => (r.delivered ? s.hooks.testOk : s.hooks.testFailed))}>
                    {s.hooks.test}
                  </button>
                  <button
                    type="button"
                    className={buttonClass.secondary}
                    disabled={pending}
                    onClick={() =>
                      secrets[e.id]
                        ? setSecrets((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== e.id)))
                        : run(
                            () => showSecret(e.id),
                            (r) => {
                              setSecrets((x) => ({ ...x, [e.id]: r.secret ?? "" }));
                              return null;
                            },
                          )
                    }
                  >
                    {secrets[e.id] ? s.hooks.hideSecret : s.hooks.showSecret}
                  </button>
                  <button
                    type="button"
                    className={buttonClass.ghost}
                    disabled={pending}
                    onClick={() =>
                      confirm(s.hooks.rotateConfirm) &&
                      run(
                        () => newSecret(e.id),
                        (r) => {
                          setSecrets((x) => ({ ...x, [e.id]: r.secret ?? "" }));
                          return s.hooks.rotated;
                        },
                      )
                    }
                  >
                    {s.hooks.rotate}
                  </button>
                  <button type="button" className={buttonClass.ghost} disabled={pending} onClick={() => run(() => changeEndpoint(e.id, { enabled: !e.enabled }))}>
                    {e.enabled ? s.hooks.pause : s.hooks.resume}
                  </button>
                  <button type="button" className={`${buttonClass.ghost} text-danger`} disabled={pending} onClick={() => confirm(s.hooks.deleteConfirm) && run(() => removeEndpoint(e.id), () => s.hooks.deleted)}>
                    {s.hooks.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{s.hooks.empty}</p>
        )}
        {props.allowed ? (
          <form
            className="mt-5 flex flex-col gap-3 border-t border-line pt-5"
            onSubmit={(ev) => {
              ev.preventDefault();
              run(
                () => addEndpoint(hookForm),
                () => {
                  setHookForm({ url: "", description: "", events: ["order.paid"] });
                  return s.hooks.added;
                },
              );
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={s.hooks.url} hint={s.hooks.urlHint}>
                <Input type="url" value={hookForm.url} required placeholder="https://example.com/sellycat" onChange={(e) => setHookForm({ ...hookForm, url: e.target.value })} />
              </Field>
              <Field label={s.hooks.description}>
                <Input value={hookForm.description} maxLength={120} placeholder={s.hooks.descriptionPlaceholder} onChange={(e) => setHookForm({ ...hookForm, description: e.target.value })} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{s.hooks.events}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={hookForm.events.includes(ev)} onChange={() => setHookForm({ ...hookForm, events: toggle(hookForm.events, ev) })} />
                    <span>
                      <code className="font-mono text-xs">{ev}</code>
                      <span className="block text-xs text-muted">{s.events[ev]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <button type="submit" className={buttonClass.primary} disabled={pending || !hookForm.events.length}>
                {s.hooks.add}
              </button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card title={s.deliveries.title} description={s.deliveries.intro}>
        {props.deliveries.length ? (
          <ul className="flex flex-col divide-y divide-line" data-testid="webhook-deliveries">
            {props.deliveries.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={d.status === "succeeded" ? "green" : d.status === "failed" ? "red" : "neutral"}>{s.deliveries.status[d.status as "pending"] ?? d.status}</Badge>
                  <code className="font-mono text-sm">{d.event?.type ?? "–"}</code>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">
                    {endpointUrl(d.endpoint_id)} · {when(d.created_at)} · {fmt(s.deliveries.attempts, { count: d.attempts })}
                    {d.last_status ? ` · HTTP ${d.last_status}` : ""}
                    {d.status === "pending" && d.attempts > 0 ? ` · ${fmt(s.deliveries.next, { date: when(d.next_attempt_at) })}` : ""}
                  </span>
                  <button type="button" className={buttonClass.ghost} onClick={() => setOpen(open === d.id ? null : d.id)}>
                    {open === d.id ? s.deliveries.hide : s.deliveries.show}
                  </button>
                  {d.status !== "sending" ? (
                    <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => run(() => resendDelivery(d.id), () => s.deliveries.resent)}>
                      {s.deliveries.resend}
                    </button>
                  ) : null}
                </div>
                {d.last_error ? <p className="mt-1 text-xs text-danger">{d.last_error}</p> : null}
                {open === d.id && d.event ? (
                  <pre className="mt-2 max-h-80 overflow-auto rounded-input bg-surface p-3 font-mono text-xs">{JSON.stringify({ id: d.event.id, type: d.event.type, data: d.event.data }, null, 2)}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={s.deliveries.empty} />
        )}
      </Card>

      <p className="text-sm text-muted">
        {s.docsIntro}{" "}
        <a href="/help/technical/api-webhooks" className={linkClass} target="_blank" rel="noopener">
          {s.docsLink}
        </a>
      </p>
    </div>
  );
}
