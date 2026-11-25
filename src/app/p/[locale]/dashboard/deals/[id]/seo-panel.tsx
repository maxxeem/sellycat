"use client";

import { useState } from "react";
import type { DealView, ShopInfo } from "@/components/shop/types";
import { Badge, Field, Input, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/fmt";
import { useI18n } from "@/lib/i18n/context";
import type { DealForm } from "@/lib/shop/deal-input";
import { DESCRIPTION_MAX, TITLE_MAX, autoDescription, autoTitle, clip, type SeoTexts } from "@/lib/shop/seo";

/** Search title, description and image texts of a deal: generated, or the shop's own words. */
export function SeoPanel({
  form,
  view,
  shop,
  shopUrl,
  seoTexts,
  set,
}: {
  form: DealForm;
  view: DealView;
  shop: ShopInfo;
  shopUrl: string;
  seoTexts: SeoTexts;
  set: <K extends keyof DealForm>(key: K, value: DealForm[K]) => void;
}) {
  const { t } = useI18n();
  const s = t.deals.seo;
  const [now] = useState(() => new Date());
  const auto = { title: autoTitle(view, shop, seoTexts), description: autoDescription(view, shop, seoTexts, now) };
  const title = form.seoTitle.trim() || auto.title;
  const description = form.seoDescription.trim() || auto.description;
  const own = Boolean(form.seoTitle.trim() || form.seoDescription.trim());
  const host = shopUrl.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-input border border-line bg-surface p-4" data-testid="seo-preview">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted">{s.preview}</p>
          <Badge tone="neutral">{own ? s.own : s.auto}</Badge>
        </div>
        {form.seoNoindex ? (
          <p className="text-sm text-muted">{s.hidden}</p>
        ) : (
          <>
            <p className="truncate text-xs text-muted">{`${host} › d › ${form.slug}`}</p>
            <p className="mt-0.5 break-words text-lg leading-snug text-accent-text">{clip(title, TITLE_MAX + 5)}</p>
            <p className="mt-1 break-words text-sm text-muted">{clip(description, DESCRIPTION_MAX + 5)}</p>
          </>
        )}
      </div>
      <Field label={s.titleField} hint={fmt(s.count, { n: title.length, max: TITLE_MAX })}>
        <Input value={form.seoTitle} maxLength={120} placeholder={auto.title} onChange={(e) => set("seoTitle", e.target.value)} data-testid="seo-title" />
      </Field>
      <Field label={s.descriptionField} hint={fmt(s.count, { n: description.length, max: DESCRIPTION_MAX })}>
        <textarea value={form.seoDescription} maxLength={320} rows={3} placeholder={auto.description} onChange={(e) => set("seoDescription", e.target.value)} className={inputClass} data-testid="seo-description" />
      </Field>
      {form.images.length ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{s.alt}</p>
          <p className="text-xs text-muted">{s.altHint}</p>
          {form.images.map((img, i) => (
            <div key={img.url} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-11 w-14 shrink-0 rounded-input border border-line object-cover" />
              <Input
                value={img.alt}
                maxLength={200}
                placeholder={fmt(s.altPlaceholder, { n: i + 1 })}
                aria-label={fmt(s.altPlaceholder, { n: i + 1 })}
                onChange={(e) => set("images", form.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
      ) : null}
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={form.seoNoindex} onChange={(e) => set("seoNoindex", e.target.checked)} className="h-4 w-4 accent-[var(--coral)]" data-testid="seo-noindex" />
        {s.noindex}
      </label>
    </div>
  );
}
