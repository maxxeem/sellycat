"use client";

import { useEffect } from "react";
import { trackShopView } from "./track-actions";

/** Shops already counted in this page load (memory only: nothing is stored on the device, so no consent is needed). */
const seen = new Set<string>();

/** Counts a shop visit once per page load (bots without JavaScript are not counted). */
export function TrackShopView({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    if (seen.has(tenantId)) return;
    seen.add(tenantId);
    void trackShopView(tenantId).catch(() => {});
  }, [tenantId]);
  return null;
}
