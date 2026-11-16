"use client";

import { generateHTML } from "@tiptap/html";
import Link from "next/link";
import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { uploadMedia } from "@/components/image-upload";
import { RichTextEditor } from "@/components/rich-text-editor";
import { DealCard } from "@/components/shop/deal-card";
import { PreviewFrame, type PreviewDevice } from "@/components/preview-frame";
import { DealDetail } from "@/components/shop/deal-detail";
import { ShopFrame } from "@/components/shop/shop-frame";
import { SHOP_CSS, themeStyle } from "@/components/shop/shop-styles";
import type { DealView, ShopInfo } from "@/components/shop/types";
import { Badge, Card, Field, Input, Notice, Select, buttonClass, inputClass } from "@/components/ui";
import { STATUS_TONE } from "@/lib/dashboard/deal-ui";
import { useI18n } from "@/lib/i18n/context";
import { BARCODE_TYPES, slugifyTitle, validateDeal, type DealErrors, type DealForm } from "@/lib/shop/deal-input";
import { dealStatus, parseMoney } from "@/lib/shop/deal-status";
import { RICH_TEXT_EXTENSIONS } from "@/lib/shop/rich-text";
import { themeFontCss, type ShopTheme } from "@/lib/shop/theme";
import { zurichLocalToIso } from "@/lib/shop/time";
import { deleteDeal, saveDeal, setDealState, type SaveResult } from "../actions";

type Partner = { id: string; name: string; logo_url: string | null; website_url: string | null; partner_locations: Array<{ id: string; name: string; street: string | null; zip: string | null; city: string | null; lat: number | null; lng: number | null; opening_hours: string | null }> };

const WEEKDAYS = { de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };

export function DealEditor(props: {
  id: string;
  tenantId: string;
  initial: DealForm;
  state: "draft" | "published" | "ended";
  stock: { sold_qty: number; reserved_qty: number };
  partners: Partner[];
  categories: Array<{ id: string; name: string; slug: string }>;
  shop: ShopInfo;
  theme: ShopTheme;
  legalComplete: boolean;
  canDelete: boolean;
}) {
  const { t, locale } = useI18n();
  const d = t.deals;
  const [form, setForm] = useState<DealForm>(props.initial);
  const [state, setState] = useState(props.state);
  const [errors, setErrors] = useState<DealErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(!props.initial.slug.startsWith("deal-"));
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<"card" | "detail">("card");
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const fonts = useMemo(() => themeFontCss(props.theme), [props.theme]);

  const set = <K extends keyof DealForm>(key: K, value: DealForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const err = (key: keyof DealForm) => (errors[key] ? d.errors[errors[key]!] : undefined);

  const partner = props.partners.find((p) => p.id === form.partnerId) ?? null;
  const view: DealView = useMemo(() => {
    let descriptionHtml = "";
    try {
      descriptionHtml = form.description ? generateHTML(form.description, RICH_TEXT_EXTENSIONS) : "";
    } catch {}
    const money = (v: string) => (v.trim() ? parseMoney(v) : null);
    return {
      id: props.id,
      slug: form.slug,
      title: form.title || "…",
      subtitle: form.subtitle || null,
      description: form.description,
      descriptionHtml,
      terms: form.terms || null,
      faq: form.faq.filter((f) => f.q && f.a),
      deal_type: form.dealType,
      price_cents: money(form.price) ?? 0,
      compare_at_cents: money(form.compareAt),
      value_cents: money(form.value),
      // The preview shows the deal as buyers will see it once published.
      state: state === "draft" ? "published" : state,
      sales_start: zurichLocalToIso(form.salesStart),
      sales_end: zurichLocalToIso(form.salesEnd),
      total_qty: form.totalQty ? Number(form.totalQty) : null,
      sold_qty: props.stock.sold_qty,
      reserved_qty: props.stock.reserved_qty,
      max_per_order: form.maxPerOrder ? Number(form.maxPerOrder) : null,
      redeem_validity: form.redeemValidity,
      redeem_until: form.redeemUntil || null,
      redeem_days: form.redeemDays ? Number(form.redeemDays) : null,
      redeem_windows: form.windows,
      show_remaining: form.showRemaining,
      show_countdown: form.showCountdown,
      show_stock_bar: form.showStockBar && form.totalQty !== "",
      featured: form.featured,
      images: form.images.map((i) => ({ url: i.url, alt: i.alt || null })),
      partner: partner ? { name: partner.name, logo_url: partner.logo_url, website_url: partner.website_url } : null,
      category: props.categories.find((c) => c.id === form.categoryId) ?? null,
      locations: (partner?.partner_locations ?? []).filter((l) => form.locationIds.includes(l.id)),
    };
  }, [form, partner, props.categories, props.id, props.stock, state]);

  const status = dealStatus({ ...view, state });
  const result = (r: SaveResult, okText: string) => {
    setErrors(r.errors ?? {});
    if (r.ok) setMessage({ tone: "success", text: okText });
    else setMessage({ tone: "error", text: r.message === "legalMissing" ? d.legalMissing : r.errors ? Object.values(r.errors).map((k) => d.errors[k!]).join(" ") : t.common.error });
  };
  const save = () =>
    start(async () => {
      const local = validateDeal(form);
      if (Object.keys(local).length) return result({ ok: false, errors: local }, "");
      result(await saveDeal(props.id, form), d.saved);
    });
  const changeState = (next: "draft" | "published" | "ended") =>
    start(async () => {
      const r = await setDealState(props.id, next, form);
      if (r.ok) setState(next);
      result(r, d.saved);
    });

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 12 - form.images.length)) urls.push(await uploadMedia(props.tenantId, "deals", file));
      setForm((f) => ({ ...f, images: [...f.images, ...urls.map((url) => ({ url, alt: "" }))] }));
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : t.common.error });
    } finally {
      setUploading(false);
    }
  };
  const moveImage = (i: number, by: number) =>
    setForm((f) => {
      const images = [...f.images];
      const [img] = images.splice(i, 1);
      images.splice(Math.max(0, Math.min(images.length, i + by)), 0, img);
      return { ...f, images };
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Action bar */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <Link href="/dashboard/deals" className="text-sm text-muted hover:text-ink">
          ← {d.title}
        </Link>
        <Badge tone={STATUS_TONE[status]}>{d.status[status]}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {props.canDelete && state === "draft" ? (
            <button type="button" className={buttonClass.ghost} disabled={pending} onClick={() => confirm(t.partners.deleteConfirm) && start(() => deleteDeal(props.id))} aria-label={t.partners.delete}>
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          {state === "published" ? (
            <>
              <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => changeState("draft")}>{d.unpublish}</button>
              <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => confirm(`${d.end}?`) && changeState("ended")}>{d.end}</button>
            </>
          ) : null}
          {state === "ended" ? <button type="button" className={buttonClass.secondary} disabled={pending} onClick={() => changeState("draft")}>{d.unpublish}</button> : null}
          <button type="button" className={buttonClass.secondary} disabled={pending || uploading} onClick={save} data-testid="deal-save">{d.save}</button>
          {state === "draft" ? (
            <button type="button" className={buttonClass.primary} disabled={pending || uploading} onClick={() => changeState("published")} data-testid="deal-publish">{d.publish}</button>
          ) : null}
        </div>
      </div>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {!props.legalComplete && state === "draft" ? <Notice>{d.legalMissing}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={d.sections.basics}>
            <div className="flex flex-col gap-4">
              <Field label={d.titleField} error={err("title")}>
                <Input
                  value={form.title}
                  maxLength={140}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugifyTitle(title) || f.slug }));
                  }}
                  data-testid="deal-title"
                />
              </Field>
              <Field label={d.subtitle}>
                <Input value={form.subtitle} maxLength={200} onChange={(e) => set("subtitle", e.target.value)} />
              </Field>
              <Field label={d.slug} error={err("slug")} hint={`/d/${form.slug}`}>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={d.partner}>
                  <Select value={form.partnerId} onChange={(e) => setForm((f) => ({ ...f, partnerId: e.target.value, locationIds: [] }))}>
                    <option value="">{d.noPartner}</option>
                    {props.partners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={d.category}>
                  <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                    <option value="">{d.noCategory}</option>
                    {props.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {partner?.partner_locations.length ? (
                <fieldset className="flex flex-col gap-2 text-sm">
                  <legend className="mb-1 font-semibold">{d.locations}</legend>
                  {partner.partner_locations.map((l) => (
                    <label key={l.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.locationIds.includes(l.id)}
                        onChange={(e) => set("locationIds", e.target.checked ? [...form.locationIds, l.id] : form.locationIds.filter((x) => x !== l.id))}
                        className="h-4 w-4 accent-[var(--coral)]"
                      />
                      {l.name} <span className="text-muted">{[l.zip, l.city].filter(Boolean).join(" ")}</span>
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </div>
          </Card>

          <Card title={d.sections.content}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold">{d.images}</span>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {form.images.map((img, i) => (
                    <div key={img.url} className="group relative aspect-square overflow-hidden rounded-input border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/60 p-1 text-white">
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="←"><ArrowUp className="h-4 w-4 -rotate-90" /></button>
                        <button type="button" onClick={() => set("images", form.images.filter((_, x) => x !== i))} aria-label={t.design.remove}><X className="h-4 w-4" /></button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label="→"><ArrowDown className="h-4 w-4 -rotate-90" /></button>
                      </div>
                    </div>
                  ))}
                  {form.images.length < 12 ? (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-input border-2 border-dashed border-line text-muted hover:border-ink hover:text-ink">
                      <Plus className="h-6 w-6" aria-hidden />
                      <span className="text-xs">{uploading ? t.common.loading : t.design.upload}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading} onChange={(e) => addImages(e.target.files)} />
                    </label>
                  ) : null}
                </div>
                <span className="text-xs text-muted">{d.imagesHint}</span>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold">{d.description}</span>
                <RichTextEditor value={form.description} onChange={(doc) => set("description", doc)} label={d.description} />
              </div>
              <Field label={d.terms}>
                <textarea value={form.terms} onChange={(e) => set("terms", e.target.value)} rows={4} className={inputClass} />
              </Field>
              <div className="flex flex-col gap-2 text-sm">
                <span className="font-semibold">{d.faq}</span>
                {form.faq.map((f, i) => (
                  <div key={i} className="flex gap-2 rounded-input border border-line p-2">
                    <div className="flex flex-1 flex-col gap-2">
                      <Input placeholder={d.faqQuestion} value={f.q} onChange={(e) => set("faq", form.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                      <textarea placeholder={d.faqAnswer} value={f.a} rows={2} className={inputClass} onChange={(e) => set("faq", form.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                    </div>
                    <button type="button" onClick={() => set("faq", form.faq.filter((_, j) => j !== i))} className="self-start p-2 text-danger" aria-label={t.design.remove}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" className={`${buttonClass.ghost} self-start`} onClick={() => set("faq", [...form.faq, { q: "", a: "" }])}><Plus className="h-4 w-4" /> {d.addFaq}</button>
              </div>
            </div>
          </Card>

          <Card title={d.sections.price}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {(["fixed", "value"] as const).map((type) => (
                  <Choice key={type} checked={form.dealType === type} onSelect={() => set("dealType", type)} title={type === "fixed" ? d.typeFixed : d.typeValue} hint={type === "fixed" ? d.typeFixedHint : d.typeValueHint} />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`${d.price} (${props.shop.currency})`} error={err("price")}>
                  <Input value={form.price} inputMode="decimal" onChange={(e) => set("price", e.target.value)} data-testid="deal-price" />
                </Field>
                <Field label={`${d.compareAt} (${props.shop.currency})`} error={err("compareAt")}>
                  <Input value={form.compareAt} inputMode="decimal" onChange={(e) => set("compareAt", e.target.value)} />
                </Field>
              </div>
              {form.dealType === "value" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`${d.value} (${props.shop.currency})`} error={err("value")}>
                    <Input value={form.value} inputMode="decimal" onChange={(e) => set("value", e.target.value)} />
                  </Field>
                  <Check label={d.partial} checked={form.partial} onChange={(v) => set("partial", v)} />
                </div>
              ) : null}
            </div>
          </Card>

          <Card title={d.sections.limits}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={d.totalQty} hint={d.unlimited} error={err("totalQty")}>
                  <Input value={form.totalQty} inputMode="numeric" onChange={(e) => set("totalQty", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label={d.maxPerOrder} error={err("maxPerOrder")}>
                  <Input value={form.maxPerOrder} inputMode="numeric" onChange={(e) => set("maxPerOrder", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label={d.maxPerBuyer} error={err("maxPerBuyer")}>
                  <Input value={form.maxPerBuyer} inputMode="numeric" onChange={(e) => set("maxPerBuyer", e.target.value.replace(/\D/g, ""))} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={d.salesStart}>
                  <Input type="datetime-local" value={form.salesStart} onChange={(e) => set("salesStart", e.target.value)} />
                </Field>
                <Field label={d.salesEnd} error={err("salesEnd")}>
                  <Input type="datetime-local" value={form.salesEnd} onChange={(e) => set("salesEnd", e.target.value)} />
                </Field>
              </div>
              <p className="text-xs text-muted">{d.timezoneHint}</p>
            </div>
          </Card>

          <Card title={d.sections.validity} description={d.legalNote}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
                {(["none", "until_date", "days_after_purchase"] as const).map((v) => (
                  <Choice key={v} checked={form.redeemValidity === v} onSelect={() => set("redeemValidity", v)} title={v === "none" ? d.validityNone : v === "until_date" ? d.validityUntil : d.validityDays} />
                ))}
              </div>
              {form.redeemValidity === "until_date" ? (
                <Field label={d.redeemUntil} error={err("redeemUntil")}>
                  <Input type="date" value={form.redeemUntil} onChange={(e) => set("redeemUntil", e.target.value)} className="max-w-xs" />
                </Field>
              ) : null}
              {form.redeemValidity === "days_after_purchase" ? (
                <Field label={d.redeemDays} error={err("redeemDays")}>
                  <Input value={form.redeemDays} inputMode="numeric" onChange={(e) => set("redeemDays", e.target.value.replace(/\D/g, ""))} className="max-w-xs" />
                </Field>
              ) : null}
              <div className="flex flex-col gap-2 text-sm">
                <span className="font-semibold">{d.windows}</span>
                {form.windows.map((w, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-input border border-line p-2">
                    {WEEKDAYS[locale].map((name, idx) => {
                      const day = idx + 1;
                      const on = w.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={on}
                          onClick={() => set("windows", form.windows.map((x, j) => (j === i ? { ...x, days: on ? x.days.filter((y) => y !== day) : [...x.days, day] } : x)))}
                          className={`h-8 w-10 rounded-input text-xs font-semibold ${on ? "bg-ink text-surface-2" : "border border-line text-muted"}`}
                        >
                          {name}
                        </button>
                      );
                    })}
                    <Input type="time" value={w.from} onChange={(e) => set("windows", form.windows.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} className="w-28" aria-label={d.from} />
                    <span>–</span>
                    <Input type="time" value={w.to} onChange={(e) => set("windows", form.windows.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} className="w-28" aria-label={d.to} />
                    <button type="button" onClick={() => set("windows", form.windows.filter((_, j) => j !== i))} className="p-2 text-danger" aria-label={t.design.remove}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" className={`${buttonClass.ghost} self-start`} onClick={() => set("windows", [...form.windows, { days: [1, 2, 3, 4, 5], from: "09:00", to: "18:00" }])}><Plus className="h-4 w-4" /> {d.addWindow}</button>
              </div>
            </div>
          </Card>

          <Card title={d.sections.format}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-3" role="radiogroup">
                {(["qr", "numeric", "barcode"] as const).map((f) => (
                  <Choice key={f} checked={form.codeFormat === f} onSelect={() => set("codeFormat", f)} title={f === "qr" ? d.formatQr : f === "numeric" ? d.formatNumeric : d.formatBarcode} />
                ))}
              </div>
              {form.codeFormat === "barcode" ? (
                <Field label={d.barcodeType} error={err("barcodeType")}>
                  <Select value={form.barcodeType} onChange={(e) => set("barcodeType", e.target.value)} className="max-w-xs">
                    <option value="">–</option>
                    {BARCODE_TYPES.map((b) => (
                      <option key={b} value={b}>{b.toUpperCase().replace("EAN", "EAN-").replace("UPCA", "UPC-A").replace("ITF14", "ITF-14").replace("CODE", "Code ")}</option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                <Choice checked={form.codeSource === "generated"} onSelect={() => set("codeSource", "generated")} title={d.sourceGenerated} />
                <Choice checked={form.codeSource === "pool"} onSelect={() => set("codeSource", "pool")} title={d.sourcePool} />
              </div>
            </div>
          </Card>

          <Card title={d.sections.display}>
            <div className="flex flex-col gap-3">
              <Check label={d.showRemaining} checked={form.showRemaining} onChange={(v) => set("showRemaining", v)} />
              <Check label={d.showCountdown} checked={form.showCountdown} onChange={(v) => set("showCountdown", v)} />
              <Check label={form.totalQty ? d.showStockBar : d.showStockBarNeedsQty} checked={form.showStockBar && form.totalQty !== ""} disabled={!form.totalQty} onChange={(v) => set("showStockBar", v)} />
              <Check label={d.featured} checked={form.featured} onChange={(v) => set("featured", v)} />
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-button border border-line bg-surface-2 p-1 text-sm">
              {(["card", "detail"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPreview(p)} className={`rounded-input px-3 py-1 font-semibold ${preview === p ? "bg-ink text-surface-2" : "text-muted"}`}>
                  {p === "card" ? d.title : d.preview}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-button border border-line bg-surface-2 p-1">
              <IconToggle on={device === "mobile"} onClick={() => setDevice("mobile")} label={t.design.previewMobile}><Smartphone className="h-4 w-4" /></IconToggle>
              <IconToggle on={device === "desktop"} onClick={() => setDevice("desktop")} label={t.design.previewDesktop}><Monitor className="h-4 w-4" /></IconToggle>
            </div>
          </div>
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <PreviewFrame device={device} testId="deal-preview">
              <style>{SHOP_CSS + fonts.faces}</style>
              {fonts.links.map((href) => (
                <link key={href} rel="stylesheet" href={href} />
              ))}
              <div className="shop-root min-h-dvh" style={themeStyle(props.theme)} data-card={props.theme.cardStyle} data-button={props.theme.buttonStyle} data-mode={props.theme.mode}>
                <ShopFrame name={props.shop.name} theme={props.theme} t={t.shop} inert>
                  {preview === "card" ? (
                    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
                      <div className={props.theme.listLayout === "list" ? "flex flex-col gap-4" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
                        <DealCard deal={view} shop={props.shop} t={t.shop} variant={props.theme.listLayout === "list" ? "list" : "grid"} />
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
                      <DealDetail deal={view} shop={props.shop} t={t.shop} />
                    </div>
                  )}
                </ShopFrame>
              </div>
            </PreviewFrame>
          </div>
        </div>
      </div>
    </div>
  );
}

function Choice({ checked, onSelect, title, hint }: { checked: boolean; onSelect: () => void; title: string; hint?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className={`flex flex-col items-start gap-0.5 rounded-input border p-3 text-left text-sm transition ${checked ? "border-ink bg-surface ring-2 ring-accent/40" : "border-line hover:border-muted"}`}>
      <span className="font-semibold">{title}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </button>
  );
}

function Check({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-3 text-sm ${disabled ? "text-muted" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" />
      {label}
    </label>
  );
}

function IconToggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={on} className={`rounded-input p-1.5 ${on ? "bg-ink text-surface-2" : "text-muted"}`}>
      {children}
    </button>
  );
}
