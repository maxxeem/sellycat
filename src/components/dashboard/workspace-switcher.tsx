"use client";

import { useTransition } from "react";
import { switchTenant } from "@/app/p/[locale]/dashboard/actions";
import { Select } from "@/components/select";
import { useI18n } from "@/lib/i18n/context";

const ADMIN = "__admin";
const NEW = "__new";

/**
 * Top of the sidebar: which shop (or the Sellycat admin) is open, a quick switch between them and
 * «Create a new shop» (page /new-shop).
 * The admin is a separate area behind its own checks (staff, MFA), so going there and back is a full
 * page load rather than a client-side transition.
 */
export function WorkspaceSwitcher({
  tenants,
  currentId,
  isStaff,
  inStaff,
}: {
  tenants: Array<{ id: string; name: string }>;
  currentId: string | null;
  isStaff: boolean;
  inStaff: boolean;
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const value = inStaff ? ADMIN : (currentId ?? "");

  if (tenants.length === 0 && !isStaff) return null;
  return (
    <Select
      aria-label={t.dashboard.switchShop}
      value={value}
      disabled={pending}
      className="mb-3 font-semibold"
      data-testid="workspace-switcher"
      onChange={(e) => {
        const next = e.target.value;
        if (next === value) return;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load into the admin area
        if (next === ADMIN) window.location.assign("/admin");
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the welcome form lives outside the dashboard layout
        else if (next === NEW) window.location.assign("/new-shop");
        else start(() => switchTenant(next));
      }}
    >
      {tenants.map((tn) => (
        <option key={tn.id} value={tn.id}>
          {tn.name}
        </option>
      ))}
      {isStaff ? <option value={ADMIN}>{t.account.staff}</option> : null}
      <option value={NEW}>{t.dashboard.newShop}</option>
    </Select>
  );
}
