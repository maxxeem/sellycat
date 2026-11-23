"use client";

import { AlertTriangle, CheckCircle2, Loader2, Monitor, Plus, Smartphone, Trash2, Upload, Wand2 } from "lucide-react";
import { useMemo, useState, useTransition, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ColorField, ColorFieldGroup } from "@/components/color-field";
import { FontPicker } from "@/components/font-picker";
import { ImageUpload, uploadMedia } from "@/components/image-upload";
import { ShopFrame } from "@/components/shop/shop-frame";
import { ShopHome } from "@/components/shop/shop-home";
import { PreviewFrame, type PreviewDevice } from "@/components/preview-frame";
import { SHOP_CSS, themeAttrs, themeStyle } from "@/components/shop/shop-styles";
import type { DealView, ShopInfo } from "@/components/shop/types";
import { Card, Field, Input, Notice, Select, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { normaliseHex } from "@/lib/design/color";
import type { BrandingSuggestion } from "@/lib/design/brand-parse";
import { FONT_ACCEPT, checkFontFile, familyFromFile, fontCssFormat } from "@/lib/design/font-file";
import { isGoogleFont } from "@/lib/design/google-fonts";
import { SOCIAL_ICON } from "@/components/shop/social-icons";
import { SOCIAL_LABEL, SOCIAL_NETWORKS, socialUrl, type SocialNetwork } from "@/lib/shop/social";
import { contrastIssues, themeFontCss, type ShopTheme, type ThemeFont } from "@/lib/shop/theme";
import { importFromWebsite, saveTheme } from "./actions";

type ColorKey = keyof ShopTheme["colors"];

export function ThemeEditor(props: { tenantId: string; initial: ShopTheme; hasUnpublished: boolean; shop: ShopInfo; deals: DealView[]; categories: Array<{ name: string; slug: string }> }) {
  const { t } = useI18n();
  const g = t.design;
  const [theme, setTheme] = useState<ShopTheme>(props.initial);
  const [dirty, setDirty] = useState(props.hasUnpublished);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [importUrl, setImportUrl] = useState("");
  const [suggestion, setSuggestion] = useState<BrandingSuggestion | undefined>(undefined);
  const [importError, setImportError] = useState<"blocked" | "unreachable" | "nothing" | null>(null);
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
        background: normaliseHex(s.colors.background) ?? th.colors.background,
        surface: normaliseHex(s.colors.surface) ?? th.colors.surface,
      },
      mode: s.mode ?? th.mode,
      fonts: {
        heading: s.fonts.heading && isGoogleFont(s.fonts.heading) ? { source: "google", family: s.fonts.heading, url: "" } : th.fonts.heading,
        body: s.fonts.body && isGoogleFont(s.fonts.body) ? { source: "google", family: s.fonts.body, url: "" } : th.fonts.body,
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
                startImport(async () => {
                  const r = await importFromWebsite(importUrl);
                  setSuggestion(r.ok ? r.suggestion : undefined);
                  setImportError(r.ok ? null : r.reason);
                });
              }}
            >
              <Input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="www.kundenfirma.ch" inputMode="url" required />
              <button type="submit" className={buttonClass.secondary} disabled={importing}>
                <Wand2 className="h-4 w-4" aria-hidden /> {importing ? t.common.loading : g.importRun}
              </button>
            </form>
            {importError ? <p className="mt-3 text-sm text-muted">{importError === "blocked" ? g.importBlocked : importError === "unreachable" ? g.importUnreachable : g.importNothing}</p> : null}
            {suggestion ? (
              <div className="mt-4 flex flex-col gap-3 rounded-input border border-line p-3 text-sm">
                {suggestion.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={suggestion.logo} alt="Logo" className="h-10 w-auto max-w-[200px] object-contain" />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {[suggestion.colors.primary, suggestion.colors.accent, suggestion.colors.background, suggestion.colors.text].filter(Boolean).map((c) => (
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
            <div className="flex flex-col gap-4">
              <ColorFieldGroup>
                {COLORS.map(([key, label]) => (
                  <ColorField key={key} label={label} value={theme.colors[key]} onChange={(hex) => setColor(key, hex)} presets={Object.values(theme.colors)} doneLabel={t.common.close} />
                ))}
              </ColorFieldGroup>
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

          <Card title={g.header} description={g.headerHint}>
            <div className="flex flex-col gap-4">
              <Segmented label={g.headerStyle} value={theme.header.style} onChange={(v) => update((th) => ({ ...th, header: { ...th.header, style: v } }))} options={[["bar", g.headerBar], ["integrated", g.headerIntegrated]]} />
              <Segmented label={g.headerFill} value={theme.header.fill} onChange={(v) => update((th) => ({ ...th, header: { ...th.header, fill: v } }))} options={[["none", g.fillNone], ["color", g.fillColor], ["gradient", g.fillGradient]]} />
              {theme.header.fill !== "none" ? (
                <ColorFieldGroup>
                  <ColorField label={theme.header.fill === "gradient" ? g.gradientFrom : g.fillColor} value={theme.header.from} onChange={(hex) => update((th) => ({ ...th, header: { ...th.header, from: hex } }))} presets={Object.values(theme.colors)} doneLabel={t.common.close} />
                  {theme.header.fill === "gradient" ? (
                    <ColorField label={g.gradientTo} value={theme.header.to} onChange={(hex) => update((th) => ({ ...th, header: { ...th.header, to: hex } }))} presets={Object.values(theme.colors)} doneLabel={t.common.close} />
                  ) : null}
                </ColorFieldGroup>
              ) : null}
              {theme.header.fill === "gradient" ? (
                <Segmented label={g.direction} value={theme.header.direction} onChange={(v) => update((th) => ({ ...th, header: { ...th.header, direction: v } }))} options={[["down", g.dirDown], ["right", g.dirRight], ["diagonal", g.dirDiagonal]]} />
              ) : null}
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
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.hero.image} label={g.heroImage} hint={g.hintHero} height="h-44" cover accept="image/png,image/jpeg,image/webp" onChange={(url) => update((th) => ({ ...th, hero: { ...th.hero, image: url, focusX: 50, focusY: 50 } }))} />
              <HeroGuide />
              {theme.hero.image ? <HeroFocus image={theme.hero.image} x={theme.hero.focusX} y={theme.hero.focusY} onChange={(focusX, focusY) => update((th) => ({ ...th, hero: { ...th.hero, focusX, focusY } }))} /> : null}
            </div>
          </Card>

          <Card title={g.images}>
            <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.logoLight} label={g.logoLight} hint={g.hintLogo} height="h-32" tone="light" onChange={(url) => update((th) => ({ ...th, logoLight: url }))} />
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.logoDark} label={g.logoDark} hint={g.hintLogo} height="h-32" tone="dark" onChange={(url) => update((th) => ({ ...th, logoDark: url }))} />
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.favicon} label={g.favicon} hint={g.hintFavicon} height="h-32" accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" onChange={(url) => update((th) => ({ ...th, favicon: url }))} />
              <ImageUpload tenantId={props.tenantId} folder="theme" value={theme.socialImage} label={g.socialImage} hint={g.hintSocial} height="h-32" cover accept="image/png,image/jpeg,image/webp" onChange={(url) => update((th) => ({ ...th, socialImage: url }))} />
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
              <SocialLinksField value={theme.socialLinks} onChange={(socialLinks) => update((th) => ({ ...th, socialLinks }))} />
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
            <PreviewFrame device={device} scheme={theme.mode === "dark" ? "dark" : "light"} height="78vh" testId="theme-preview">
              {fonts.links.map((href) => (
                <link key={href} rel="stylesheet" href={href} />
              ))}
              <style>{SHOP_CSS + fonts.faces}</style>
              <div className="shop-root min-h-dvh" style={themeStyle(theme)} {...themeAttrs(theme)}>
                <ShopFrame name={props.shop.name} theme={theme} t={t.shop} inert>
                  <ShopHome shop={props.shop} theme={theme} t={t.shop} deals={sampleDeals} categories={props.categories} inert />
                </ShopFrame>
              </div>
            </PreviewFrame>
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
function SocialLinksField({ value, onChange }: { value: ShopTheme["socialLinks"]; onChange: (v: ShopTheme["socialLinks"]) => void }) {
  const { t } = useI18n();
  const g = t.design;
  const free = SOCIAL_NETWORKS.filter((n) => !value.some((v) => v.network === n));
  const set = (i: number, patch: Partial<ShopTheme["socialLinks"][number]>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
      <div>
        <p className="font-semibold">{g.socialTitle}</p>
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

/** What the header picture should look like (size, format, what gets cropped). */
function HeroGuide() {
  const { t } = useI18n();
  const g = t.design;
  return (
    <div className="rounded-input bg-surface p-3 text-xs">
      <p className="mb-1.5 font-semibold text-ink">{g.heroGuideTitle}</p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-muted">
        {g.heroGuide.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Focus point of the header picture: a click on the whole picture sets the point that stays
 * visible; next to it the crops the shop shows on a wide screen and on a phone.
 */
function HeroFocus({ image, x, y, onChange }: { image: string; x: number; y: number; onChange: (x: number, y: number) => void }) {
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
        <p className="font-semibold">{g.heroFocus}</p>
        <p className="text-xs text-muted">{g.heroFocusHint}</p>
      </div>
      {/* The whole picture (at most 18rem high); the dot marks the focus point. */}
      <div className="flex justify-center rounded-input border border-line bg-surface">
      <div
        role="slider"
        tabIndex={0}
        aria-label={g.heroFocus}
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
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] items-end gap-3">
        <figure className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="aspect-[18/5] w-full rounded-input border border-line object-cover" style={{ objectPosition: position }} />
          <figcaption className="flex items-center gap-1 text-xs text-muted"><Monitor className="h-3.5 w-3.5" aria-hidden /> {g.previewDesktop}</figcaption>
        </figure>
        <figure className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="aspect-[6/5] w-full rounded-input border border-line object-cover" style={{ objectPosition: position }} />
          <figcaption className="flex items-center gap-1 text-xs text-muted"><Smartphone className="h-3.5 w-3.5" aria-hidden /> {g.previewMobile}</figcaption>
        </figure>
      </div>
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
    show_countdown: false, show_stock_bar: false, images: [], partner: null, category: null, locations: [],
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
