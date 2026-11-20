"use client";

import { useEffect } from "react";
import { trackView } from "./actions";

/** Deals already counted in this page load (memory only: nothing is stored on the device, so no consent is needed). */
const seen = new Set<string>();

/** Counts a deal visit once per page load (bots without JavaScript are not counted). */
export function TrackView({ dealId }: { dealId: string }) {
  useEffect(() => {
    if (seen.has(dealId)) return;
    seen.add(dealId);
    void trackView(dealId).catch(() => {});
  }, [dealId]);
  return null;
}
