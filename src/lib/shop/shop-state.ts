/**
 * Shop online/offline (`tenants.shop_state`) and the texts of its notes (`tenants.shop_notice`).
 * Isomorphic, unit-tested.
 */
export const SHOP_STATES = ["building", "online", "closed"] as const;
export type ShopState = (typeof SHOP_STATES)[number];
export const isShopState = (v: unknown): v is ShopState => typeof v === "string" && (SHOP_STATES as readonly string[]).includes(v);

export const NOTICE_KEYS = ["building_title", "building_text", "closed_title", "closed_text"] as const;
export type NoticeKey = (typeof NOTICE_KEYS)[number];
export type ShopNotice = Partial<Record<NoticeKey, string | null>>;
export const NOTICE_MAX = { building_title: 80, building_text: 300, closed_title: 80, closed_text: 300 } as const;

type Defaults = { building: { title: string; text: string }; closed: { title: string; text: string } };

/** The texts a note shows: the shop's own, else the default of the shop's language. */
export function noticeTexts(notice: ShopNotice | null | undefined, defaults: Defaults) {
  const pick = (key: NoticeKey, fallback: string) => {
    const v = notice?.[key]?.trim();
    return v ? v : fallback;
  };
  return {
    building: { title: pick("building_title", defaults.building.title), text: pick("building_text", defaults.building.text) },
    closed: { title: pick("closed_title", defaults.closed.title), text: pick("closed_text", defaults.closed.text) },
  };
}

/** Form input → stored texts (trimmed, cut to length, empty = default). */
export function parseNotice(get: (key: NoticeKey) => unknown): Record<NoticeKey, string | null> {
  return Object.fromEntries(
    NOTICE_KEYS.map((k) => {
      const raw = get(k);
      const v = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, NOTICE_MAX[k]) : "";
      return [k, v || null];
    }),
  ) as Record<NoticeKey, string | null>;
}
