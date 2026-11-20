import type { Dictionary } from "@/lib/i18n";

/** Dashboard sections in menu order, with the phase that brings each one (docs/PLAN.md §5). */
export const DASHBOARD_SECTIONS = [
  { key: "deals", phase: 2 },
  { key: "partners", phase: 2 },
  { key: "orders", phase: 3 },
  { key: "settlements", phase: 7 },
  { key: "vouchers", phase: 4 },
  { key: "redemptions", phase: 4 },
  { key: "design", phase: 2 },
  { key: "arrangement", phase: 2 },
  { key: "payments", phase: 3 },
  { key: "domains", phase: 6 },
  { key: "analytics", phase: 7 },
  { key: "team", phase: 7 },
  { key: "developers", phase: 7 },
  { key: "billing", phase: 7 },
  { key: "settings", phase: 2 },
  { key: "support", phase: 7 },
  { key: "help", phase: 7 },
] as const satisfies ReadonlyArray<{ key: keyof Dictionary["dashboard"]["nav"]; phase: number }>;

export type SectionKey = (typeof DASHBOARD_SECTIONS)[number]["key"];
export const isSection = (v: string): v is SectionKey => DASHBOARD_SECTIONS.some((s) => s.key === v);

/** Sections that already have their own page (the placeholder route skips them). */
export const BUILT_SECTIONS = new Set<SectionKey>(["settlements", "support", "help", "deals", "partners", "orders", "vouchers", "redemptions", "design", "arrangement", "payments", "domains", "analytics", "billing", "team", "settings"]);

/**
 * Lowest role that sees a section in the menu (the page itself checks the same or more).
 * Redeemers and scanners only see what redemption needs.
 */
export const SECTION_MIN_ROLE: Record<SectionKey, "redeemer" | "editor" | "admin"> = {
  deals: "editor",
  partners: "editor",
  orders: "editor",
  settlements: "admin",
  vouchers: "editor",
  redemptions: "redeemer",
  design: "editor",
  arrangement: "editor",
  payments: "admin",
  domains: "admin",
  analytics: "editor",
  team: "editor",
  developers: "admin",
  billing: "editor",
  settings: "editor",
  support: "redeemer",
  help: "redeemer",
};
