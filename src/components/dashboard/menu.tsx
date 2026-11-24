"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import { CaretDown, ChartLineUp, GearSix, House, Lifebuoy, Question, ShoppingBagOpen, Storefront, Ticket, type IconProps } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n";
import { SECTION_MIN_ROLE, type SectionKey } from "@/lib/dashboard/nav";
import { roleAtLeast, type MemberRole } from "@/lib/auth/roles";

type Icon = ComponentType<IconProps>;
type MenuLabel = (t: Dictionary) => string;
type Entry =
  | { kind: "link"; href: string; icon: Icon; label: MenuLabel }
  | { kind: "group"; id: string; icon: Icon; label: MenuLabel; items: Array<{ key: SectionKey; label?: MenuLabel }> };

const nav = (k: SectionKey | "overview"): MenuLabel => (t) => t.dashboard.nav[k];

/** Main entries with icons; related pages sit below as sub-entries. */
const MENU: Entry[] = [
  { kind: "link", href: "/dashboard", icon: House, label: nav("overview") },
  { kind: "group", id: "sales", icon: ShoppingBagOpen, label: (t) => t.dashboard.menu.sales, items: [{ key: "deals" }, { key: "orders" }, { key: "partners" }, { key: "settlements" }] },
  { kind: "group", id: "vouchers", icon: Ticket, label: (t) => t.dashboard.menu.vouchers, items: [{ key: "vouchers", label: (t) => t.dashboard.menu.issued }, { key: "redemptions" }] },
  { kind: "group", id: "shop", icon: Storefront, label: (t) => t.dashboard.menu.shop, items: [{ key: "design" }, { key: "arrangement" }, { key: "deal-alert" }, { key: "domains" }] },
  { kind: "link", href: "/dashboard/analytics", icon: ChartLineUp, label: nav("analytics") },
  {
    kind: "group",
    id: "settings",
    icon: GearSix,
    label: (t) => t.dashboard.menu.settings,
    items: [{ key: "settings", label: (t) => t.dashboard.menu.general }, { key: "payments" }, { key: "team" }, { key: "billing" }, { key: "developers" }],
  },
];

const FOOTER: Array<{ href: string; icon: Icon; label: MenuLabel }> = [
  { href: "/help", icon: Question, label: nav("help") },
  { href: "/dashboard/support", icon: Lifebuoy, label: nav("support") },
];

const row = "flex w-full items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition";
const idle = "text-muted hover:bg-surface hover:text-ink";
const current = "bg-accent/10 font-semibold text-accent-text";

/** Customer dashboard menu: groups open by themselves when one of their pages is shown. */
export function DashboardMenu({ isActive, onNavigate, role = "owner" }: { isActive: (href: string) => boolean; onNavigate: () => void; role?: MemberRole }) {
  const { t } = useI18n();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  return (
    <>
      <ul className="flex flex-col gap-0.5">
        {MENU.map((original) => {
          // Only what this role may open; a group without visible items disappears.
          const entry = original.kind === "group" ? { ...original, items: original.items.filter((i) => roleAtLeast(role, SECTION_MIN_ROLE[i.key])) } : original;
          if (entry.kind === "group" && !entry.items.length) return null;
          if (entry.kind === "link" && entry.href === "/dashboard/analytics" && !roleAtLeast(role, SECTION_MIN_ROLE.analytics)) return null;
          const Icon = entry.icon;
          if (entry.kind === "link") {
            const on = isActive(entry.href);
            return (
              <li key={entry.href}>
                <Link href={entry.href} prefetch={false} onClick={onNavigate} aria-current={on ? "page" : undefined} className={`${row} ${on ? current : idle}`}>
                  <Icon size={19} weight="light" className="shrink-0 opacity-80" />
                  {entry.label(t)}
                </Link>
              </li>
            );
          }
          const hasActive = entry.items.some((i) => isActive(`/dashboard/${i.key}`));
          const open = toggled[entry.id] ?? hasActive;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setToggled((s) => ({ ...s, [entry.id]: !open }))}
                aria-expanded={open}
                className={`${row} ${hasActive ? "text-ink" : idle}`}
              >
                <Icon size={19} weight="light" className="shrink-0 opacity-80" />
                <span className="flex-1 text-left">{entry.label(t)}</span>
                <CaretDown size={12} weight="bold" className={`shrink-0 opacity-40 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open ? (
                <ul className="mb-1 ml-[1.3rem] mt-0.5 flex flex-col gap-0.5 border-l border-line pl-3">
                  {entry.items.map((item) => {
                    const href = `/dashboard/${item.key}`;
                    const on = isActive(href);
                    return (
                      <li key={item.key}>
                        <Link
                          href={href}
                          prefetch={false}
                          onClick={onNavigate}
                          aria-current={on ? "page" : undefined}
                          className={`block rounded-input px-3 py-1.5 text-sm transition ${on ? current : "text-muted hover:bg-surface hover:text-ink"}`}
                        >
                          {(item.label ?? nav(item.key))(t)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 flex flex-col gap-0.5 border-t border-line pt-4">
        {FOOTER.map((f) => {
          const Icon = f.icon;
          const on = isActive(f.href);
          return (
            <li key={f.href}>
              <Link href={f.href} prefetch={false} onClick={onNavigate} aria-current={on ? "page" : undefined} className={`${row} ${on ? current : idle}`}>
                <Icon size={19} weight="light" className="shrink-0 opacity-80" />
                {f.label(t)}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
