import type { BadgeTone } from "@/components/ui";
import type { Database } from "@/lib/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export const ORDER_STATUSES: OrderStatus[] = ["paid", "partially_refunded", "refunded", "pending", "expired"];

export const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  pending: "amber",
  paid: "green",
  partially_refunded: "coral",
  refunded: "neutral",
  expired: "neutral",
};

/** Date and time in Swiss time, as the dashboard shows them. */
export function dateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === "de" ? "de-CH" : "en-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
}
