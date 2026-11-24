"use client";

import { Trash2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { useActionState, useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Field, Input, Notice, Select, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { LOCALE_LABEL, LOCALES } from "@/lib/i18n/locales";
import { addCategory, deleteCategory, saveBilling, saveLegal, saveShopSettings, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  const { t } = useI18n();
  if (state?.error === "googleVerification") return <Notice tone="error">{t.settings.googleVerificationError}</Notice>;
  if (state?.error) return <Notice tone="error">{t.common.error}</Notice>;
  if (state?.ok) return <Notice tone="success">{t.common.saved}</Notice>;
  return null;
}

function Submit({ pending }: { pending: boolean }) {
  const { t } = useI18n();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`}>
      {pending ? t.common.loading : t.common.save}
    </button>
  );
}

export function ShopSettingsForm({ values }: { values: Record<string, string> }) {
  const { t } = useI18n();
  const s = t.settings;
  const [state, action, pending] = useActionState(saveShopSettings, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={s.shopName}>
        <Input name="name" defaultValue={values.name} required maxLength={120} />
      </Field>
      <Field label={s.language}>
        <Select name="locale" defaultValue={values.locale}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>{LOCALE_LABEL[l]}</option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={s.contactEmail}>
          <Input name="contactEmail" type="email" defaultValue={values.contactEmail} />
        </Field>
        <Field label={s.contactPhone}>
          <Input name="contactPhone" type="tel" defaultValue={values.contactPhone} />
        </Field>
      </div>
      <Field label={s.seoTitle} hint={s.seoTitleHint}>
        <Input name="seoTitle" defaultValue={values.seoTitle} maxLength={120} />
      </Field>
      <Field label={s.seoDescription} hint={s.seoDescriptionHint}>
        <textarea name="seoDescription" defaultValue={values.seoDescription} rows={2} maxLength={300} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={s.mailFromName}>
          <Input name="mailFromName" defaultValue={values.mailFromName} maxLength={80} />
        </Field>
        <Field label={s.replyTo}>
          <Input name="replyTo" type="email" defaultValue={values.replyTo} />
        </Field>
      </div>
      <Field label={s.googleVerification} hint={s.googleVerificationHint}>
        <Input name="googleVerification" defaultValue={values.googleVerification} maxLength={300} />
      </Field>
      <p className="pt-2 text-sm font-semibold">{s.analytics}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={s.ga4}>
          <Input name="ga4" defaultValue={values.ga4} placeholder="G-XXXXXXXXXX" />
        </Field>
        <Field label={s.metaPixel}>
          <Input name="metaPixel" defaultValue={values.metaPixel} inputMode="numeric" />
        </Field>
      </div>
      <Status state={state} />
      <Submit pending={pending} />
    </form>
  );
}

export function BillingForm({ values }: { values: Record<string, string | null> }) {
  const { t } = useI18n();
  const s = t.settings;
  const [state, action, pending] = useActionState(saveBilling, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={s.legalName}>
        <Input name="legal_name" defaultValue={values.legal_name ?? ""} />
      </Field>
      <Field label={s.street}>
        <Input name="street" defaultValue={values.street ?? ""} />
      </Field>
      <div className="grid grid-cols-[100px_1fr_80px] gap-3">
        <Field label={s.zip}>
          <Input name="zip" defaultValue={values.zip ?? ""} />
        </Field>
        <Field label={s.city}>
          <Input name="city" defaultValue={values.city ?? ""} />
        </Field>
        <Field label={s.country}>
          <Input name="country" defaultValue={values.country ?? "CH"} maxLength={2} />
        </Field>
      </div>
      <Field label={s.vatNo}>
        <Input name="vat_no" defaultValue={values.vat_no ?? ""} placeholder="CHE-123.456.789 MWST" />
      </Field>
      <Status state={state} />
      <Submit pending={pending} />
    </form>
  );
}

/** Imprint, terms and privacy with simple formatting; each document goes to the action as JSON. */
export function LegalForm({ values }: { values: Record<"imprint" | "terms" | "privacy", JSONContent> }) {
  const { t } = useI18n();
  const s = t.settings;
  const [state, action, pending] = useActionState(saveLegal, null);
  const [docs, setDocs] = useState(values);
  return (
    <form action={action} className="flex flex-col gap-5">
      {(["imprint", "terms", "privacy"] as const).map((k) => (
        <div key={k} className="flex flex-col gap-1.5 text-sm" data-testid={`legal-${k}`}>
          <span className="font-semibold">{s[k]}</span>
          <input type="hidden" name={k} value={JSON.stringify(docs[k])} />
          <RichTextEditor value={values[k]} onChange={(doc) => setDocs((d) => ({ ...d, [k]: doc }))} label={s[k]} tools="simple" minHeight={k === "imprint" ? "min-h-32" : "min-h-56"} stickyToolbar="top-[66px] lg:top-0" />
        </div>
      ))}
      <Status state={state} />
      <Submit pending={pending} />
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Array<{ id: string; name: string; slug: string }> }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(addCategory, null);
  const [deleting, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1 text-sm">
            {c.name}
            <button type="button" disabled={deleting} onClick={() => confirm(t.partners.deleteConfirm) && start(() => deleteCategory(c.id))} className="rounded-full p-1 text-muted hover:text-danger" aria-label={t.partners.delete}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form action={action} className="flex gap-2">
        <Input name="name" placeholder={t.deals.newCategory} required maxLength={60} />
        <button type="submit" disabled={pending} className={buttonClass.secondary}>
          {t.settings.addCategory}
        </button>
      </form>
      {state?.error ? <Notice tone="error">{t.common.error}</Notice> : null}
    </div>
  );
}
