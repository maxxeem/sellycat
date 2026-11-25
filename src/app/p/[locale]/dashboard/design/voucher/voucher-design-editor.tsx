"use client";

import { useEffect, useState, useTransition } from "react";
import { ColorField } from "@/components/color-field";
import { Card, Notice, buttonClass, inputClass } from "@/components/ui";
import { VoucherAdUpload } from "@/components/voucher-ad-upload";
import { useI18n } from "@/lib/i18n/context";
import { NOTE_MAX, VOUCHER_LAYOUTS, VOUCHER_SIZES, designQuery, type VoucherDesign, type VoucherLayout } from "@/lib/vouchers/design";
import { saveVoucherDesign } from "../actions";

/** Small sketch of each layout for the picker. */
function LayoutSketch({ layout, color }: { layout: VoucherLayout; color: string }) {
  return (
    <svg viewBox="0 0 60 84" className="h-24 w-auto rounded border border-line bg-white" aria-hidden>
      {layout === "classic" ? (
        <>
          <rect x="0" y="0" width="60" height="3" fill={color} />
          <rect x="6" y="8" width="18" height="4" rx="1" fill="#222" />
          <rect x="6" y="16" width="48" height="18" rx="2" fill="#ddd" />
          <rect x="6" y="38" width="34" height="4" rx="1" fill="#222" />
          <rect x="6" y="47" width="48" height="16" rx="3" fill="none" stroke={color} strokeWidth="1.2" />
          <rect x="40" y="50" width="10" height="10" fill="#222" />
          <rect x="9" y="52" width="22" height="3" fill="#222" />
          <rect x="6" y="68" width="48" height="2" fill="#ccc" />
          <rect x="6" y="72" width="40" height="2" fill="#ccc" />
        </>
      ) : layout === "ticket" ? (
        <>
          <rect x="0" y="0" width="60" height="26" fill={color} />
          <rect x="6" y="6" width="16" height="4" rx="1" fill="#fff" />
          <rect x="6" y="15" width="36" height="4" rx="1" fill="#fff" opacity=".9" />
          <line x1="4" y1="31" x2="56" y2="31" stroke="#bbb" strokeDasharray="2 2" />
          <rect x="24" y="36" width="12" height="12" fill="#222" />
          <rect x="16" y="52" width="28" height="3" fill="#222" />
          <rect x="20" y="58" width="20" height="2" fill="#999" />
          <rect x="6" y="68" width="48" height="2" fill="#ccc" />
          <rect x="6" y="72" width="40" height="2" fill="#ccc" />
        </>
      ) : (
        <>
          <rect x="6" y="8" width="16" height="4" rx="1" fill="#222" />
          <rect x="6" y="18" width="8" height="1.5" fill={color} />
          <rect x="6" y="23" width="38" height="4" rx="1" fill="#222" />
          <line x1="6" y1="38" x2="54" y2="38" stroke="#ccc" strokeWidth=".6" />
          <rect x="6" y="44" width="24" height="3" fill="#222" />
          <rect x="42" y="42" width="11" height="11" fill="#222" />
          <line x1="6" y1="58" x2="54" y2="58" stroke="#ccc" strokeWidth=".6" />
          <rect x="6" y="66" width="48" height="2" fill="#ddd" />
          <rect x="6" y="70" width="40" height="2" fill="#ddd" />
        </>
      )}
    </svg>
  );
}

/** Advertising half for all deals (a deal can have its own or none). */
function AdCard({ tenantId, design, set }: { tenantId: string; design: VoucherDesign; set: <K extends keyof VoucherDesign>(key: K, value: VoucherDesign[K]) => void }) {
  const { t } = useI18n();
  const g = t.voucherDesign;
  return (
    <Card title={g.ad} description={g.adHint}>
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={design.adEnabled} onChange={(e) => set("adEnabled", e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" data-testid="ad-enabled" />
          {g.adEnabled}
        </label>
        {design.adEnabled ? (
          <>
            <VoucherAdUpload tenantId={tenantId} size={design.size} value={design.adImage} onChange={(url) => set("adImage", url)} />
            <p className="text-xs text-muted">{design.adImage ? g.adFitHint : g.adMissing}</p>
          </>
        ) : null}
      </div>
    </Card>
  );
}

export function VoucherDesignEditor({ tenantId, initial, shopColor }: { tenantId: string; initial: VoucherDesign; shopColor: string }) {
  const { t } = useI18n();
  const g = t.voucherDesign;
  const [design, setDesign] = useState<VoucherDesign>(initial);
  const [preview, setPreview] = useState(designQuery(initial));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(design) !== JSON.stringify(initial);
  const set = <K extends keyof VoucherDesign>(key: K, value: VoucherDesign[K]) => {
    setMessage(null);
    setDesign((d) => ({ ...d, [key]: value }));
  };

  // The PDF is rendered on the server: wait until typing stops.
  useEffect(() => {
    const id = setTimeout(() => setPreview(designQuery(design)), 600);
    return () => clearTimeout(id);
  }, [design]);

  const save = () =>
    start(async () => {
      const r = await saveVoucherDesign(design);
      setMessage(r.ok ? { tone: "success", text: g.saved } : { tone: "error", text: g.failed });
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <h1 className="text-xl font-bold">{g.title}</h1>
        <div className="ml-auto">
          <button type="button" className={buttonClass.primary} disabled={pending || !dirty} onClick={save} data-testid="voucher-design-save">
            {pending ? "…" : t.common.save}
          </button>
        </div>
      </div>
      <p className="text-sm text-muted">{g.intro}</p>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <Card title={g.layout}>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={g.layout}>
              {VOUCHER_LAYOUTS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={design.layout === l}
                  onClick={() => set("layout", l)}
                  className={`flex flex-col items-center gap-2 rounded-input border p-3 text-center transition ${design.layout === l ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}
                  data-testid={`layout-${l}`}
                >
                  <LayoutSketch layout={l} color={design.accent ?? shopColor} />
                  <span className="text-sm font-semibold">{g.layouts[l]}</span>
                  <span className="text-xs text-muted">{g.layoutHints[l]}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title={g.size}>
            <div className="inline-flex flex-wrap gap-1 rounded-button border border-line bg-surface p-1" role="radiogroup" aria-label={g.size}>
              {VOUCHER_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={design.size === s}
                  onClick={() => set("size", s)}
                  className={`rounded-input px-3 py-1.5 text-sm font-semibold ${design.size === s ? "bg-ink text-surface-2" : "text-muted hover:text-ink"}`}
                >
                  {g.sizes[s]}
                </button>
              ))}
            </div>
          </Card>

          <AdCard tenantId={tenantId} design={design} set={set} />

          <Card title={g.accent}>
            <div className="flex flex-col gap-3">
              <ColorField label={g.accent} value={design.accent ?? shopColor} onChange={(hex) => set("accent", hex.toLowerCase() === shopColor.toLowerCase() ? null : hex)} presets={[shopColor, "#111111", "#ffffff"]} doneLabel={t.common.close} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={design.accent === null} onChange={(e) => set("accent", e.target.checked ? null : shopColor)} className="h-4 w-4 accent-[var(--coral)]" />
                {g.shopColor}
              </label>
            </div>
          </Card>

          <Card title={g.show}>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["showImage", g.showImage],
                  ["showLocations", g.showLocations],
                  ["showTerms", g.showTerms],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={design[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" />
                  {label}
                </label>
              ))}
              <label className="mt-2 flex flex-col gap-1.5">
                <span className="text-sm font-semibold">{g.note}</span>
                <textarea
                  value={design.note ?? ""}
                  onChange={(e) => set("note", e.target.value.slice(0, NOTE_MAX) || null)}
                  rows={3}
                  placeholder={g.notePlaceholder}
                  className={inputClass}
                />
                <span className="text-right text-xs text-muted">
                  {(design.note ?? "").length} / {NOTE_MAX}
                </span>
              </label>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card title={g.preview}>
            <p className="mb-3 text-xs text-muted">{g.previewHint}</p>
            <iframe
              key={preview}
              src={`/api/dashboard/voucher-preview?${preview}#toolbar=0&navpanes=0&view=FitH`}
              title={g.preview}
              className={`w-full rounded-input border border-line bg-white ${design.size === "a6" ? "aspect-[105/148]" : "aspect-[210/297]"}`}
              data-testid="voucher-preview"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
