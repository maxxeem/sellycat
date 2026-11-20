import type { BadgeTone } from "@/components/ui";
import type { WaitlistStatus } from "@/lib/access/rules";

export const STATUS_TONE: Record<WaitlistStatus, BadgeTone> = { new: "coral", invited: "amber", registered: "green", rejected: "neutral" };
