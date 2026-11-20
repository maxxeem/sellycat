/** Support request vocabulary and checks (pure, isomorphic, unit-tested). */

export const SUPPORT_CATEGORIES = ["question", "problem", "billing", "feature", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export const SUPPORT_STATUSES = ["new", "in_progress", "done"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

/** Badge colours per status (dashboard and staff). */
export const STATUS_TONE = { new: "coral", in_progress: "amber", done: "neutral" } as const;

export const isSupportCategory = (v: unknown): v is SupportCategory => typeof v === "string" && (SUPPORT_CATEGORIES as readonly string[]).includes(v);
export const isSupportStatus = (v: unknown): v is SupportStatus => typeof v === "string" && (SUPPORT_STATUSES as readonly string[]).includes(v);

export const ATTACHMENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};
export const ATTACHMENT_MAX = 10 * 1024 * 1024;

export type Attachment = { path: string; name: string; bytes: number };

/** An attachment path is only accepted inside the uploader's own folder (`<userId>/<uuid>.<ext>`). */
export function ownAttachment(userId: string, a: { path?: unknown; name?: unknown; bytes?: unknown } | null): Attachment | null {
  if (!a || typeof a.path !== "string" || !a.path) return null;
  const ext = Object.values(ATTACHMENT_TYPES).join("|");
  if (!new RegExp(`^${userId}/[0-9a-f-]{36}\\.(${ext})$`).test(a.path)) return null;
  const name = String(a.name ?? "").replace(/[\r\n/\\]/g, " ").trim().slice(0, 120) || "attachment";
  const bytes = Math.max(0, Math.min(ATTACHMENT_MAX, Math.round(Number(a.bytes) || 0)));
  return { path: a.path, name, bytes };
}

export function cleanText(v: unknown, max: number): string {
  return String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}
