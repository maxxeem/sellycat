"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Monitor, Plus, Smartphone, Trash2, Upload, type LucideIcon } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ColorField, ColorFieldGroup } from "@/components/color-field";
import { FontPicker } from "@/components/font-picker";
import { uploadMedia } from "@/components/image-upload";
import type { PreviewDevice } from "@/components/preview-frame";
import { SOCIAL_ICON } from "@/components/shop/social-icons";
import { Field, Input, Select, buttonClass } from "@/components/ui";
import { FONT_ACCEPT, checkFontFile, familyFromFile, fontCssFormat } from "@/lib/design/font-file";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import { SOCIAL_LABEL, SOCIAL_NETWORKS, socialUrl, type SocialNetwork } from "@/lib/shop/social";
import type { HeroBackdrop, ShopTheme, ThemeFont } from "@/lib/shop/theme";

/** Building blocks of the shop design editor (theme-editor.tsx). */

export function FontField({ label, value, onChange, tenantId }: { label: string; value: ThemeFont; onChange: (f: ThemeFont) => void; tenantId: string }) {
  const { t } = useI18n();
  const g = t.design;
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileName = value.url ? decodeURIComponent(value.url.split("/").pop() ?? "") : "";
  const upload = async (file: File) => {
    setStatus(null);
    const check = checkFontFile(file.name, file.size, new Uint8Array(await file.slice(0, 4).arrayBuffer()));
    if (!check.ok) {
      setStatus({ tone: "error", text: check.error === "size" ? g.fontTooBig : g.fontWrongType });
      return;
    }
    setUploading(true);
    try {
      // Stored under its real format, whatever the file name says.
      const typed = new File([file], `${file.name.replace(/\.[a-z0-9]+$/i, "")}.${check.ext}`, { type: check.mime });
      const url = await uploadMedia(tenantId, "fonts", typed);
      onChange({ ...value, family: value.family.trim() || familyFromFile(file.name), url });
      setStatus({ tone: "success", text: fmt(g.fontUploaded, { file: file.name }) });
    } catch {
      setStatus({ tone: "error", text: g.fontUploadFailed });
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      <Select value={value.source} onChange={(e) => onChange({ source: e.target.value as ThemeFont["source"], family: e.target.value === "system" ? "" : value.family, url: "" })}>
        <option value="system">{g.fontSystem}</option>
        <option value="google">{g.fontGoogle}</option>
        <option value="custom">{g.fontCustom}</option>
      </Select>
      {value.source === "google" ? (
        <FontPicker value={value.family} placeholder={g.fontSearch} onChange={(family) => onChange({ ...value, family })} />
      ) : null}
      {value.source === "custom" ? (
        <div className="flex flex-col gap-2">
          <Field label={g.fontName} hint={g.fontNameHint}>
            <Input value={value.family} placeholder="Brand Sans" maxLength={80} onChange={(e) => onChange({ ...value, family: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${buttonClass.secondary} cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
              {uploading ? g.uploading : value.url ? g.replaceFont : g.uploadFont}
              <input
                type="file"
                accept={FONT_ACCEPT}
                className="sr-only"
                data-testid="font-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void upload(file);
                }}
              />
            </label>
            {value.url && !status ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{fmt(g.fontActive, { file: fileName })}</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted">{g.fontFormats}</p>
          {status ? (
            <p role="status" className={`flex items-start gap-1.5 text-xs font-semibold ${status.tone === "success" ? "text-success" : "text-danger"}`}>
              {status.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
              {status.text}
            </p>
          ) : null}
          {value.url && value.family ? (
            <div className="rounded-input border border-line bg-surface p-3" style={{ fontFamily: `"${value.family.replace(/"/g, "")}", system-ui` }} data-testid="custom-font-sample">
              <style>{`@font-face{font-family:"${value.family.replace(/"/g, "")}";src:url("${value.url.replace(/"/g, "")}") format("${fontCssFormat(value.url)}");font-display:swap;}`}</style>
              <p className="text-xl font-bold leading-tight">{g.fontSampleTitle}</p>
              <p className="mt-1 text-sm">{g.fontSampleText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Social media profiles for the footer: network + link or @handle, at most one per network. */
export function SocialLinksField({ value, onChange }: { value: ShopTheme["socialLinks"]; onChange: (v: ShopTheme["socialLinks"]) => void }) {
  const { t } = useI18n();
  const g = t.design;
  const free = SOCIAL_NETWORKS.filter((n) => !value.some((v) => v.network === n));
  const set = (i: number, patch: Partial<ShopTheme["socialLinks"][number]>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <h3 className="font-semibold">{g.socialTitle}</h3>
        <p className="text-xs text-muted">{g.socialHint}</p>
      </div>
      {value.map((l, i) => {
        const Icon = SOCIAL_ICON[l.network];
        const bad = l.url.trim() !== "" && !socialUrl(l.network, l.url);
        return (
          <div key={l.network} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line" aria-hidden>
                <Icon className="h-5 w-5" />
              </span>
              <div className="w-36 shrink-0">
                <Select value={l.network} onChange={(e) => set(i, { network: e.target.value as SocialNetwork })} aria-label={g.socialNetwork}>
                  {SOCIAL_NETWORKS.filter((n) => n === l.network || free.includes(n)).map((n) => (
                    <option key={n} value={n}>{SOCIAL_LABEL[n]}</option>
                  ))}
                </Select>
              </div>
              <Input value={l.url} placeholder={g.socialPlaceholder} maxLength={300} onChange={(e) => set(i, { url: e.target.value })} aria-label={fmt(g.socialLink, { network: SOCIAL_LABEL[l.network] })} autoCapitalize="none" spellCheck={false} />
              <button type="button" className="p-2 text-danger" aria-label={g.remove} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {bad ? <p className="pl-12 text-xs text-danger">{g.socialInvalid}</p> : null}
          </div>
        );
      })}
      {free.length ? (
        <button type="button" className={`${buttonClass.ghost} self-start`} onClick={() => onChange([...value, { network: free[0]!, url: "" }])} data-testid="social-add">
          <Plus className="h-4 w-4" /> {g.socialAdd}
        </button>
      ) : null}
    </div>
  );
}

/** Background of the hero on one device; `children` are the picture controls. */
export function HeroBackdropField({ title, value, presets, onChange, children }: { title: string; value: HeroBackdrop; presets: string[]; onChange: (v: HeroBackdrop) => void; children: ReactNode }) {
  const { t } = useI18n();
  const g = t.design;
  return (
    <div className="flex flex-col gap-4">
      <Segmented label={title} value={value.kind} onChange={(kind) => onChange({ ...value, kind })} options={[["image", g.heroBgImage], ["color", g.fillColor], ["gradient", g.fillGradient], ["none", g.heroBgNone]]} />
      {value.kind === "image" ? children : null}
      {value.kind === "color" || value.kind === "gradient" ? (
        <ColorFieldGroup>
          <ColorField label={value.kind === "gradient" ? g.gradientFrom : g.fillColor} value={value.from} onChange={(from) => onChange({ ...value, from })} presets={presets} doneLabel={t.common.close} />
          {value.kind === "gradient" ? <ColorField label={g.gradientTo} value={value.to} onChange={(to) => onChange({ ...value, to })} presets={presets} doneLabel={t.common.close} /> : null}
        </ColorFieldGroup>
      ) : null}
      {value.kind === "gradient" ? <Segmented label={g.direction} value={value.direction} onChange={(direction) => onChange({ ...value, direction })} options={[["down", g.dirDown], ["right", g.dirRight], ["diagonal", g.dirDiagonal]]} /> : null}
      {value.kind === "none" ? <p className="text-xs text-muted">{g.heroBgNoneHint}</p> : null}
    </div>
  );
}

/** What the header picture should look like (size, format, what gets cropped). */
export function HeroGuide() {
  const { t } = useI18n();
  const g = t.design;
  return (
    <details className="rounded-input bg-surface p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-ink">{g.heroGuideTitle}</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-muted">
        {g.heroGuide.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Focus point of the header picture: a click on the whole picture sets the point that stays
 * visible; next to it the crops the shop shows on a wide screen and on a phone.
 */
export function HeroFocus({ label, devices, image, x, y, onChange }: { label: string; devices: PreviewDevice[]; image: string; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const { t } = useI18n();
  const g = t.design;
  const position = `${x}% ${y}%`;
  const set = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));
    onChange(clamp(((e.clientX - box.left) / box.width) * 100), clamp(((e.clientY - box.top) / box.height) * 100));
  };
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted">{g.heroFocusHint}</p>
      </div>
      {/* The whole picture (at most 18rem high); the dot marks the focus point. */}
      <div className="flex justify-center rounded-input border border-line bg-surface">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuetext={`${x} % / ${y} %`}
        aria-valuenow={x}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          set(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) set(e);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          const keys: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
          const d = keys[e.key];
          if (!d) return;
          e.preventDefault();
          onChange(Math.min(100, Math.max(0, x + d[0])), Math.min(100, Math.max(0, y + d[1])));
        }}
        className="relative cursor-crosshair touch-none select-none overflow-hidden"
        data-testid="hero-focus"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" draggable={false} className="block max-h-72 w-auto max-w-full" />
        <span className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-coral/70 shadow-[0_0_0_2px_rgba(0,0,0,0.45)]" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden />
      </div>
      </div>
      <div className={`grid items-end gap-3 ${devices.length === 2 ? "grid-cols-[minmax(0,3fr)_minmax(0,1fr)]" : devices[0] === "mobile" ? "max-w-40" : ""}`}>
        {devices.includes("desktop") ? (
        <figure className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="aspect-[18/5] w-full rounded-input border border-line object-cover" style={{ objectPosition: position }} />
          <figcaption className="flex items-center gap-1 text-xs text-muted"><Monitor className="h-3.5 w-3.5" aria-hidden /> {g.previewDesktop}</figcaption>
        </figure>
        ) : null}
        {devices.includes("mobile") ? (
        <figure className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="aspect-[6/5] w-full rounded-input border border-line object-cover" style={{ objectPosition: position }} />
          <figcaption className="flex items-center gap-1 text-xs text-muted"><Smartphone className="h-3.5 w-3.5" aria-hidden /> {g.previewMobile}</figcaption>
        </figure>
        ) : null}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      <div className="inline-flex flex-wrap gap-1 rounded-button border border-line bg-surface p-1" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={`rounded-input px-3 py-1.5 font-semibold ${value === v ? "bg-ink text-surface-2" : "text-muted hover:text-ink"}`}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One part of a section: thin line above, small heading. */
export function Part({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      {title ? (
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * One section of the editor: a row with its current state, opened by a click. The fields stay
 * mounted while closed, so a running upload is not lost.
 */
export function Section({ id, icon: Icon, title, summary, open, warn = false, onToggle, children }: { id: string; icon: LucideIcon; title: string; summary: ReactNode; open: boolean; warn?: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section id={id} className="group scroll-mt-44 border-t border-line first:border-t-0 lg:scroll-mt-24" data-testid={`design-${id}`}>
      <h2>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition group-first:rounded-t-card hover:bg-surface ${open ? "bg-surface" : "group-last:rounded-b-card"}`}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-input ${open ? "bg-accent/15 text-accent-text" : "bg-surface text-muted"}`} aria-hidden>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs text-muted">{summary}</span>
          </span>
          {warn ? <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden /> : null}
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </h2>
      <div id={`${id}-panel`} hidden={!open} className="border-t border-line">
        <div className="flex flex-col gap-5 p-4 sm:p-5">{children}</div>
      </div>
    </section>
  );
}
