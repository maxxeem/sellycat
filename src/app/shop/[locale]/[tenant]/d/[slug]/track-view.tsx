"use client";

import { useEffect } from "react";
import { trackView } from "./actions";

/** Counts a visit once per browser session (bots without JavaScript are not counted). */
export function TrackView({ dealId }: { dealId: string }) {
  useEffect(() => {
    const key = `sc_view_${dealId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode without storage: count anyway.
    }
    void trackView(dealId).catch(() => {});
  }, [dealId]);
  return null;
}
