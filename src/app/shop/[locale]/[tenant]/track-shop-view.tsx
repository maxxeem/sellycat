"use client";

import { useEffect } from "react";
import { trackShopView } from "./track-actions";

/** Counts a shop visit once per browser session (bots without JavaScript are not counted). */
export function TrackShopView({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    const key = `sc_shop_${tenantId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode without storage: count anyway.
    }
    void trackShopView(tenantId).catch(() => {});
  }, [tenantId]);
  return null;
}
