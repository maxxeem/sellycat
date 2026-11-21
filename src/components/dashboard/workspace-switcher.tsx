"use client";

import { useTransition } from "react";
import { switchTenant } from "@/app/p/[locale]/dashboard/actions";
import { Select } from "@/components/select";
import { useI18n } from "@/lib/i18n/context";

const ADMIN = "__admin";

/**
 * Top of the sidebar: which shop (or the Sellycat admin) is open, and a quick switch between them.
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
  const canSwitch = tenants.length > 1 || (isStaff && tenants.length > 0);

  if (!canSwitch) {
    const label = inStaff ? t.account.staff : tenants.find((x) => x.id === currentId)?.name;
    return label ? <p className="mb-3 truncate px-3 text-xs font-bold uppercase tracking-wider text-muted">{label}</p> : null;
  }
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
        else start(() => switchTenant(next));
      }}
    >
      {tenants.map((tn) => (
        <option key={tn.id} value={tn.id}>
          {tn.name}
        </option>
      ))}
      {isStaff ? <option value={ADMIN}>{t.account.staff}</option> : null}
    </Select>
  );
}
