"use client";

import { useActionState, useState } from "react";
import { HoursEditor } from "@/components/hours-editor";
import { PlaceSearch } from "@/components/place-search";
import { ImageUpload } from "@/components/image-upload";
import { Field, Input, Notice, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { parseHours, type OpeningHours } from "@/lib/shop/hours";
import { findPlaces, getPlace, saveLocation, savePartner } from "./actions";

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
      <ImageUpload tenantId={tenantId} folder="partners" name="logo" value={partner?.logo_url ?? ""} label={t.partners.logo} hint={t.partners.logoHint} height="h-32" tone="light" />
      {state?.error ? <Notice tone="error">{t.common.error}</Notice> : state?.ok ? <Notice tone="success">{t.common.saved}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}

type Location = {
  id: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string;
  opening_hours: string | null;
  hours: unknown;
  google_place_id: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * A redemption place: found on Google (address, position, opening hours taken over) or entered
 * by hand; opening hours always as a weekday grid.
 */
export function LocationForm({ partnerId, location, onDone }: { partnerId: string; location?: Location; onDone?: () => void }) {
  const { t } = useI18n();
  const p = t.partners;
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveLocation>[0], form: FormData) => {
    const result = await saveLocation(prev, form);
    if (result?.ok) onDone?.();
    return result;
  }, null);
  const [f, setF] = useState({
    name: location?.name ?? "",
    street: location?.street ?? "",
    zip: location?.zip ?? "",
    city: location?.city ?? "",
    country: location?.country ?? "CH",
  });
  const [hours, setHours] = useState<OpeningHours | null>(parseHours(location?.hours));
  const [place, setPlace] = useState<{ id: string; lat: number | null; lng: number | null } | null>(
    location?.google_place_id ? { id: location.google_place_id, lat: location.lat, lng: location.lng } : null,
  );
  const [taken, setTaken] = useState(false);
  // Changing the address by hand means the Google position may no longer fit: geocode again.
  const edit = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    if (k !== "name" && place) setPlace({ ...place, lat: null, lng: null });
  };

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="partnerId" value={partnerId} />
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <input type="hidden" name="hours" value={hours ? JSON.stringify(hours) : ""} />
      <input type="hidden" name="placeId" value={place?.id ?? ""} />
      <input type="hidden" name="lat" value={place?.lat ?? ""} />
      <input type="hidden" name="lng" value={place?.lng ?? ""} />

      <PlaceSearch
        search={findPlaces}
        details={getPlace}
        onPick={(pl) => {
          setF({ name: f.name || pl.name, street: pl.street ?? "", zip: pl.zip ?? "", city: pl.city ?? "", country: pl.country });
          setPlace({ id: pl.placeId, lat: pl.lat, lng: pl.lng });
          if (pl.hours) setHours(pl.hours);
          setTaken(true);
        }}
      />
      {taken ? <Notice tone="success">{p.placeTaken}</Notice> : null}

      <Field label={p.locationName}>
        <Input name="name" value={f.name} onChange={(e) => edit("name", e.target.value)} required />
      </Field>
      <Field label={p.street}>
        <Input name="street" value={f.street} onChange={(e) => edit("street", e.target.value)} autoComplete="street-address" />
      </Field>
      <div className="grid grid-cols-[100px_1fr_80px] gap-3">
        <Field label={p.zip}>
          <Input name="zip" value={f.zip} onChange={(e) => edit("zip", e.target.value)} inputMode="numeric" />
        </Field>
        <Field label={p.city}>
          <Input name="city" value={f.city} onChange={(e) => edit("city", e.target.value)} />
        </Field>
        <Field label={p.country}>
          <Input name="country" value={f.country} onChange={(e) => edit("country", e.target.value.toUpperCase())} maxLength={2} />
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{p.openingHours}</span>
        <HoursEditor value={hours} onChange={setHours} />
      </div>
      {state?.error ? <Notice tone="error">{t.common.error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass.secondary} data-testid="location-save">
        {pending ? t.common.loading : t.common.save}
      </button>
    </form>
  );
}
