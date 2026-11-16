"use client";

import { AlertTriangle, CheckCircle2, Monitor, Plus, Smartphone, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { ColorPicker } from "@/components/color-picker";
import { ImageUpload, uploadMedia } from "@/components/image-upload";
import { ShopFrame } from "@/components/shop/shop-frame";
import { ShopHome } from "@/components/shop/shop-home";
import { SHOP_CSS, themeStyle } from "@/components/shop/shop-styles";
import type { DealView, ShopInfo } from "@/components/shop/types";
import { Card, Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { normaliseHex } from "@/lib/design/color";
import type { BrandingSuggestion } from "@/lib/design/brand-parse";
import { GOOGLE_FONTS } from "@/lib/design/google-fonts";
import { contrastIssues, themeFontCss, type ShopTheme, type ThemeFont } from "@/lib/shop/theme";
import { importFromWebsite, saveTheme } from "./actions";

type ColorKey = keyof ShopTheme["colors"];

export function ThemeEditor(props: { tenantId: string; initial: ShopTheme; hasUnpublished: boolean; shop: ShopInfo; deals: DealView[]; categories: Array<{ name: string; slug: string }> }) {
  const { t } = useI18n();
  const g = t.design;
  const [theme, setTheme] = useState<ShopTheme>(props.initial);
  const [dirty, setDirty] = useState(props.hasUnpublished);
  const [openColor, setOpenColor] = useState<ColorKey | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [importUrl, setImportUrl] = useState("");
  const [suggestion, setSuggestion] = useState<BrandingSuggestion | null | undefined>(undefined);
  const [importing, startImport] = useTransition();

  const update = (fn: (t: ShopTheme) => ShopTheme) => {
    setTheme(fn);
    setDirty(true);
  };
  const setColor = (key: ColorKey, value: string) => update((th) => ({ ...th, colors: { ...th.colors, [key]: value } }));
  const setFont = (which: "heading" | "body", font: ThemeFont) => update((th) => ({ ...th, fonts: { ...th.fonts, [which]: font } }));

  const issues = contrastIssues(theme);
  const fonts = themeFontCss(theme);
  const sampleDeals = useMemo(() => (props.deals.length ? props.deals : sampleDealsFor(props.shop.locale)), [props.deals, props.shop.locale]);

  const save = (publish: boolean) =>
    start(async () => {
      const r = await saveTheme(theme, publish);
      if (r.ok) {
        setMessage({ tone: "success", text: publish ? g.published : g.savedDraft });
        if (publish) setDirty(false);
      } else setMessage({ tone: "error", text: t.common.error });
    });

  const applySuggestion = (s: BrandingSuggestion) => {
    update((th) => ({
      ...th,
      logoLight: s.logo ?? th.logoLight,
      favicon: s.favicon ?? th.favicon,
      socialImage: s.socialImage ?? th.socialImage,
      colors: {
        ...th.colors,
        primary: normaliseHex(s.colors.primary) ?? th.colors.primary,
        accent: normaliseHex(s.colors.accent) ?? th.colors.accent,
        text: normaliseHex(s.colors.text) ?? th.colors.text,
      },
      fonts: {
        heading: s.fonts.heading && (GOOGLE_FONTS as readonly string[]).includes(s.fonts.heading) ? { source: "google", family: s.fonts.heading, url: "" } : th.fonts.heading,
        body: s.fonts.body && (GOOGLE_FONTS as readonly string[]).includes(s.fonts.body) ? { source: "google", family: s.fonts.body, url: "" } : th.fonts.body,
      },
    }));
    setSuggestion(undefined);
  };

  const COLORS: Array<[ColorKey, string]> = [
    ["primary", g.primary],
    ["accent", g.accent],
    ["background", g.background],
    ["surface", g.surface],
    ["text", g.text],
    ["success", g.success],
    ["warning", g.warning],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <h1 className="text-xl font-bold">{g.title}</h1>
        {dirty ? <span className="text-sm text-warn">{g.unpublished}</span> : null}
        <div className="ml-auto flex gap-2">
          <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => save(false)}>{t.common.save}</button>
          <button type="button" className={buttonClass.primary} disabled={pending} onClick={() => save(true)} data-testid="theme-publish">{g.publish}</button>
        </div>
      </div>
      <p className="text-sm text-muted">{g.intro}</p>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="grid gap-6 2xl:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={g.importTitle} description={g.importHint}>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                startImport(async () => setSuggestion(await importFromWebsite(importUrl)));
              }}
            >
              <Input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="www.kundenfirma.ch" inputMode="url" required />
              <button type="submit" className={buttonClass.secondary} disabled={importing}>
                <Wand2 className="h-4 w-4" aria-hidden /> {importing ? t.common.loading : g.importRun}
              </button>
            </form>
            {suggestion === null ? <p className="mt-3 text-sm text-muted">{g.importNothing}</p> : null}
            {suggestion ? (
              <div className="mt-4 flex flex-col gap-3 rounded-input border border-line p-3 text-sm">
                {suggestion.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={suggestion.logo} alt="Logo" className="h-10 w-auto max-w-[200px] object-contain" />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {[suggestion.colors.primary, suggestion.colors.accent, suggestion.colors.text].filter(Boolean).map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded-full border border-line px-2 py-1 font-mono text-xs">
                      <span className="h-4 w-4 rounded-full border border-line" style={{ background: c }} /> {c}
                    </span>
                  ))}
                </div>
                {suggestion.fonts.heading || suggestion.fonts.body ? <p className="text-muted">{[suggestion.fonts.heading, suggestion.fonts.body].filter(Boolean).join(" / ")}</p> : null}
                <button type="button" className={`${buttonClass.primary} self-start`} onClick={() => applySuggestion(suggestion)}>{g.importApply}</button>
              </div>
            ) : null}
          </Card>

          <Card title={g.colors}>
            <div className="flex flex-col gap-3">
              {COLORS.map(([key, label]) => (
                <div key={key}>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setOpenColor(openColor === key ? null : key)} className="h-9 w-9 shrink-0 rounded-input border border-line" style={{ background: theme.colors[key] }} aria-label={label} aria-expanded={openColor === key} />
                    <span className="flex-1 text-sm font-semibold">{label}</span>
                    <Input
                      value={theme.colors[key]}
                      onChange={(e) => {
                        const v = normaliseHex(e.target.value);
                        if (v) setColor(key, v);
                      }}
                      className="w-28 font-mono"
                      aria-label={`${label} Hex`}
                    />
                  </div>
                  {openColor === key ? (
                    <div className="mt-3 max-w-xs">
                      <ColorPicker value={theme.colors[key]} onChange={(hex) => setColor(key, hex.toLowerCase())} presets={Object.values(theme.colors)} />
                    </div>
                  ) : null}
                </div>
              ))}
              {issues.length ? (
                <Notice tone="error">
                  <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden />
                  {fmt(g.contrastWarn, { pairs: issues.map((i) => `${i.pair} (${i.ratio}:1)`).join(", ") })}
                </Notice>
              ) : (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {g.contrastOk}
                </p>
              )}
            </div>
          </Card>

          <Card title={g.fonts}>
            <div className="flex flex-col gap-5">
              <FontField label={g.headingFont} value={theme.fonts.heading} onChange={(f) => setFont("heading", f)} tenantId={props.tenantId} />
              <FontField label={g.bodyFont} value={theme.fonts.body} onChange={(f) => setFont("body", f)} tenantId={props.tenantId} />
            </div>
          </Card>

          <Card title={g.shape}>
            <div className="flex flex-col gap-4">
              <Field label={`${g.radius}: ${theme.radius}px`}>
                <input type="range" min={0} max={28} value={theme.radius} onChange={(e) => update((th) => ({ ...th, radius: Number(e.target.value) }))} className="accent-[var(--coral)]" />
              </Field>
              <Segmented label={g.buttonStyle} value={theme.buttonStyle} onChange={(v) => update((th) => ({ ...th, buttonStyle: v }))} options={[["solid", g.buttonSolid], ["outline", g.buttonOutline], ["pill", g.buttonPill]]} />
              <Segmented label={g.cardStyle} value={theme.cardStyle} onChange={(v) => update((th) => ({ ...th, cardStyle: v }))} options={[["flat", g.cardFlat], ["bordered", g.cardBordered], ["elevated", g.cardElevated]]} />
              <Segmented label={g.layout} value={theme.listLayout} onChange={(v) => update((th) => ({ ...th, listLayout: v }))} options={[["grid", g.layoutGrid], ["list", g.layoutList], ["featured", g.layoutFeatured]]} />
              <Segmented
                label={g.mode}
                value={theme.mode}
                onChange={(v) =>
                  update((th) => ({
                    ...th,
                    mode: v,
                    // Switching the mode flips the grounds so the shop stays readable; colours can be tuned afterwards.
                    colors: v === th.mode ? th.colors : { ...th.colors, background: v === "dark" ? "#111111" : "#ffffff", surface: v === "dark" ? "#1c1c1c" : "#f5f5f5", text: v === "dark" ? "#ffffff" : "#111111" },
                  }))
                }
                options={[["light", g.light], ["dark", g.dark]]}
              />
            </div>
          </Card>

          <Card title={g.hero}>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={theme.hero.enabled} onChange={(e) => update((th) => ({ ...th, hero: { ...th.hero, enabled: e.target.checked } }))} className="h-4 w-4 accent-[var(--coral)]" />
                {g.heroEnabled}
              </label>
              <Field label={g.heroTitle}>
                <Input value={theme.hero.title} maxLength={120} onChange={(e) => update((th) => ({ ...th, hero: { ...th.hero, title: e.target.value } }))} placeholder={props.shop.name} />
              </Field>
              <Field label={g.heroSubtitle}>
                <Input value={theme.hero.subtitle} maxLength={240} onChange={(e) => update((th) => ({ ...th, hero: { ...th.hero, subtitle: e.target.value } }))} />
              </Field>
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.hero.image} label={g.heroImage} removeLabel={g.remove} aspect="aspect-[16/7]" onChange={(url) => update((th) => ({ ...th, hero: { ...th.hero, image: url } }))} />
            </div>
          </Card>

          <Card title={g.images}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.logoLight} label={g.logoLight} removeLabel={g.remove} onChange={(url) => update((th) => ({ ...th, logoLight: url }))} />
              <div className="rounded-input bg-ink p-2 [&_span]:text-white">
                <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.logoDark} label={g.logoDark} removeLabel={g.remove} onChange={(url) => update((th) => ({ ...th, logoDark: url }))} />
              </div>
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.favicon} label={g.favicon} removeLabel={g.remove} aspect="aspect-square max-w-[120px]" accept="image/png,image/svg+xml,image/x-icon" onChange={(url) => update((th) => ({ ...th, favicon: url }))} />
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.socialImage} label={g.socialImage} removeLabel={g.remove} aspect="aspect-[1200/630]" onChange={(url) => update((th) => ({ ...th, socialImage: url }))} />
            </div>
          </Card>

          <Card title={g.footer}>
            <div className="flex flex-col gap-2">
              {theme.footerLinks.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={l.label} placeholder={g.linkLabel} onChange={(e) => update((th) => ({ ...th, footerLinks: th.footerLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
                  <Input value={l.url} placeholder="https://…" onChange={(e) => update((th) => ({ ...th, footerLinks: th.footerLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }))} />
                  <button type="button" className="p-2 text-danger" aria-label={g.remove} onClick={() => update((th) => ({ ...th, footerLinks: th.footerLinks.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" className={`${buttonClass.ghost} self-start`} onClick={() => update((th) => ({ ...th, footerLinks: [...th.footerLinks, { label: "", url: "" }] }))}>
                <Plus className="h-4 w-4" /> {g.addLink}
              </button>
            </div>
          </Card>
        </div>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <div className="mb-3 flex justify-end">
            <div className="inline-flex rounded-button border border-line bg-surface-2 p-1">
              <Toggle on={device === "desktop"} onClick={() => setDevice("desktop")} label={g.previewDesktop}><Monitor className="h-4 w-4" /></Toggle>
              <Toggle on={device === "mobile"} onClick={() => setDevice("mobile")} label={g.previewMobile}><Smartphone className="h-4 w-4" /></Toggle>
            </div>
          </div>
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            {fonts.links.map((href) => (
              <link key={href} rel="stylesheet" href={href} />
            ))}
            <style>{SHOP_CSS + fonts.faces}</style>
            <div className={`mx-auto ${device === "mobile" ? "max-w-[390px] border-x border-line" : ""}`}>
              <div className="shop-root max-h-[78vh] overflow-y-auto" style={themeStyle(theme)} data-card={theme.cardStyle} data-button={theme.buttonStyle} data-testid="theme-preview">
                <ShopFrame name={props.shop.name} theme={theme} t={t.shop} inert>
                  <ShopHome shop={props.shop} theme={theme} t={t.shop} deals={sampleDeals} categories={props.categories} inert />
                </ShopFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FontField({ label, value, onChange, tenantId }: { label: string; value: ThemeFont; onChange: (f: ThemeFont) => void; tenantId: string }) {
  const { t } = useI18n();
  const g = t.design;
  const [uploading, setUploading] = useState(false);
  const listId = `fonts-${label.replace(/\W/g, "")}`;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      <Select value={value.source} onChange={(e) => onChange({ source: e.target.value as ThemeFont["source"], family: e.target.value === "system" ? "" : value.family, url: "" })}>
        <option value="system">{g.fontSystem}</option>
        <option value="google">{g.fontGoogle}</option>
        <option value="custom">{g.fontCustom}</option>
      </Select>
      {value.source === "google" ? (
        <>
          <Input list={listId} value={value.family} placeholder={g.fontSearch} onChange={(e) => onChange({ ...value, family: e.target.value })} />
          <datalist id={listId}>
            {GOOGLE_FONTS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </>
      ) : null}
      {value.source === "custom" ? (
        <div className="flex flex-col gap-2">
          <Input value={value.family} placeholder="Font name" onChange={(e) => onChange({ ...value, family: e.target.value })} />
          <label className={`${buttonClass.secondary} cursor-pointer self-start`}>
            {uploading ? t.common.loading : value.url ? "✓ woff2" : g.uploadFont}
            <input
              type="file"
              accept=".woff2,font/woff2"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const url = await uploadMedia(tenantId, "fonts", file);
                  onChange({ ...value, family: value.family || file.name.replace(/\.woff2$/i, ""), url });
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
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

function Toggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={on} className={`rounded-input p-1.5 ${on ? "bg-ink text-surface-2" : "text-muted"}`}>
      {children}
    </button>
  );
}

/** Example deals for the preview of a shop that has none yet. */
function sampleDealsFor(locale: "de" | "en"): DealView[] {
  const base = {
    subtitle: null, description: null, terms: null, faq: [], value_cents: null, state: "published" as const, sales_start: null, sales_end: null, total_qty: null,
    sold_qty: 0, reserved_qty: 0, max_per_order: null, redeem_validity: "none" as const, redeem_until: null, redeem_days: null, redeem_windows: [], show_remaining: false,
    show_countdown: false, images: [], partner: null, category: null, locations: [],
  };
  const items = locale === "de" ? ["2 Pizzas nach Wahl", "Wertgutschein CHF 50", "Tageseintritt Freizeitpark"] : ["Two pizzas of your choice", "Gift voucher CHF 50", "Theme park day pass"];
  return items.map((title, i) => ({
    ...base,
    id: `sample-${i}`,
    slug: `sample-${i}`,
    title,
    deal_type: i === 1 ? ("value" as const) : ("fixed" as const),
    price_cents: [2000, 4000, 3900][i],
    compare_at_cents: [4000, 5000, 5900][i],
    featured: i === 0,
  }));
}
