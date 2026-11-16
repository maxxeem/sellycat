import type { BadgeTone } from "@/components/ui";
import type { DealStatus } from "@/lib/shop/deal-status";

export const STATUS_TONE: Record<DealStatus, BadgeTone> = { draft: "neutral", scheduled: "amber", live: "green", sold_out: "coral", ended: "neutral" };
