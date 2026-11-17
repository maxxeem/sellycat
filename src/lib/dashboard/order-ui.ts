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

export type VoucherStatus = Database["public"]["Enums"]["voucher_status"];
export const VOUCHER_STATUSES: VoucherStatus[] = ["valid", "redeemed", "expired", "refunded", "void"];
export const VOUCHER_TONE: Record<VoucherStatus, BadgeTone> = { valid: "green", redeemed: "neutral", expired: "amber", refunded: "neutral", void: "red" };

/** Shown status: a valid voucher past its date counts as expired (the row flips on the next redemption try). */
export const shownVoucherStatus = (v: { status: VoucherStatus; valid_until: string | null }, now = new Date()): VoucherStatus =>
  v.status === "valid" && v.valid_until !== null && new Date(v.valid_until) <= now ? "expired" : v.status;
