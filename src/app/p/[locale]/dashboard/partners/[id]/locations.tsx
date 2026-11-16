"use client";

import { MapPin, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyState, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { deleteLocation, deletePartner } from "../actions";
import { LocationForm } from "../partner-form";

type Location = { id: string; name: string; street: string | null; zip: string | null; city: string | null; country: string; opening_hours: string | null; lat: number | null };

export function LocationList({ partnerId, locations }: { partnerId: string; locations: Location[] }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<string | "new" | null>(locations.length ? null : "new");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      {!locations.length && editing !== "new" ? <EmptyState title={t.partners.noLocations} /> : null}
      <ul className="flex flex-col gap-3">
        {locations.map((l) =>
          editing === l.id ? (
            <li key={l.id} className="rounded-input border border-line p-3">
              <LocationForm partnerId={partnerId} location={l} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={l.id} className="flex items-start gap-3 rounded-input border border-line p-3">
              <MapPin className={`mt-0.5 h-5 w-5 shrink-0 ${l.lat !== null ? "text-accent-text" : "text-muted"}`} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{l.name}</p>
                <p className="text-muted">{[l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
                <p className="text-xs text-muted">{l.lat !== null ? t.partners.geocoded : t.partners.notGeocoded}</p>
              </div>
              <button type="button" onClick={() => setEditing(l.id)} className="rounded-input p-2 text-muted hover:text-ink" aria-label={t.partners.edit}>
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirm(t.partners.deleteConfirm) && start(() => deleteLocation(l.id))}
                className="rounded-input p-2 text-danger hover:bg-danger/10"
                aria-label={t.partners.delete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <div className="rounded-input border border-line p-3">
          <LocationForm partnerId={partnerId} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={buttonClass.secondary}>
          {t.partners.addLocation}
        </button>
      )}
    </div>
  );
}

export function DeletePartner({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => confirm(t.partners.deleteConfirm) && start(() => deletePartner(id))} className={buttonClass.danger}>
      <Trash2 className="h-4 w-4" aria-hidden /> {t.partners.delete}
    </button>
  );
}
