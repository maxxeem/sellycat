/** Fixed help-center categories in page order (keys are stored on articles). */
export const HELP_CATEGORIES = ["getting-started", "deals", "payments", "vouchers", "design", "team-account", "billing", "technical"] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];
export const isHelpCategory = (v: unknown): v is HelpCategory => typeof v === "string" && (HELP_CATEGORIES as readonly string[]).includes(v);
export const HELP_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
