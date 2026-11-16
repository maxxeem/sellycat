import type { BadgeTone } from "@/components/ui";

export const statusTone = (status: string): BadgeTone => (status === "active" ? "green" : status === "trial" ? "coral" : status === "suspended" ? "amber" : "neutral");
