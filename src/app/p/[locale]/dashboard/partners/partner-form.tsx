"use client";

import { useActionState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { Field, Input, Notice, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { saveLocation, savePartner } from "./actions";

type Partner = { id: string; name: string; description: string | null; website_url: string | null; email: string | null; phone: string | null; logo_url: string | null };

export function PartnerForm({ tenantId, partner }: { tenantId: string; partner?: Partner }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(savePartner, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      {partner ? <input type="hidden" name="id" value={partner.id} /> : null}
      <Field label={t.partners.name}>
        <Input name="name" defaultValue={partner?.name} required maxLength={120} />
      </Field>
      <Field label={t.partners.description}>
        <textarea name="description" defaultValue={partner?.description ?? ""} rows={3} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.partners.website}>
          <Input name="website" defaultValue={partner?.website_url ?? ""} inputMode="url" />
        </Field>
        <Field label={t.partners.phone}>
          <Input name="phone" defaultValue={partner?.phone ?? ""} type="tel" />
        </Field>
      </div>
      <Field label={t.partners.email}>
        <Input name="email" defaultValue={partner?.email ?? ""} type="email" />
      </Field>
      <ImageUpload tenantId={tenantId} folder="partners" name="logo" value={partner?.logo_url ?? ""} label={t.partners.logo} hint={t.design.hintLogo} height="h-32" tone="light" />
      {state?.error ? <Notice tone="error">{t.common.error}</Notice> : state?.ok ? <Notice tone="success">{t.common.saved}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}

type Location = { id: string; name: string; street: string | null; zip: string | null; city: string | null; country: string; opening_hours: string | null; lat: number | null };

export function LocationForm({ partnerId, location, onDone }: { partnerId: string; location?: Location; onDone?: () => void }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveLocation>[0], form: FormData) => {
    const result = await saveLocation(prev, form);
    if (result?.ok) onDone?.();
    return result;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="partnerId" value={partnerId} />
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <Field label={t.partners.locationName}>
        <Input name="name" defaultValue={location?.name} required />
      </Field>
      <Field label={t.partners.street}>
        <Input name="street" defaultValue={location?.street ?? ""} autoComplete="street-address" />
      </Field>
      <div className="grid grid-cols-[100px_1fr_80px] gap-3">
        <Field label={t.partners.zip}>
          <Input name="zip" defaultValue={location?.zip ?? ""} inputMode="numeric" />
        </Field>
        <Field label={t.partners.city}>
          <Input name="city" defaultValue={location?.city ?? ""} />
        </Field>
        <Field label={t.partners.country}>
          <Input name="country" defaultValue={location?.country ?? "CH"} maxLength={2} />
        </Field>
      </div>
      <Field label={t.partners.openingHours}>
        <textarea name="openingHours" defaultValue={location?.opening_hours ?? ""} rows={2} className={inputClass} />
      </Field>
      {state?.error ? <Notice tone="error">{t.common.error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.secondary}>
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}
