/**
 * Social media links in the shop footer (`theme.socialLinks`). Isomorphic, unit-tested: which
 * networks exist and how an entry (a full link, a link without https://, or an @handle) becomes a
 * safe https URL.
 */
export const SOCIAL_NETWORKS = ["website", "instagram", "facebook", "tiktok", "youtube", "x", "linkedin", "threads", "pinterest", "whatsapp", "telegram", "snapchat", "spotify", "discord", "twitch"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export const isSocialNetwork = (v: unknown): v is SocialNetwork => typeof v === "string" && (SOCIAL_NETWORKS as readonly string[]).includes(v);

export const SOCIAL_LABEL: Record<SocialNetwork, string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  linkedin: "LinkedIn",
  threads: "Threads",
  pinterest: "Pinterest",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  snapchat: "Snapchat",
  spotify: "Spotify",
  discord: "Discord",
  twitch: "Twitch",
};

/** Profile URL for an @handle (networks where a handle alone is unambiguous). */
const HANDLE_URL: Partial<Record<SocialNetwork, (h: string) => string>> = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  pinterest: (h) => `https://www.pinterest.com/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  twitch: (h) => `https://www.twitch.tv/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
};

/** An entry → https URL, or null when it is not usable. */
export function socialUrl(network: SocialNetwork, raw: string): string | null {
  const v = raw.trim();
  if (!v || v.length > 300) return null;
  const handle = /^@?([A-Za-z0-9._-]{1,60})$/.exec(v);
  if (handle && !v.includes(".") && HANDLE_URL[network]) return HANDLE_URL[network]!(handle[1]!);
  if (handle && v.startsWith("@") && HANDLE_URL[network]) return HANDLE_URL[network]!(handle[1]!);
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".") || u.username || u.password) return null;
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}
