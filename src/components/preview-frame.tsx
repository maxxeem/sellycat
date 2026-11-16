"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Viewport widths the previews simulate (iPhone 14 and a common laptop). */
export const PREVIEW_WIDTHS = { mobile: 390, desktop: 1280 } as const;
export type PreviewDevice = keyof typeof PREVIEW_WIDTHS;

/**
 * A real viewport for live previews: children render into an iframe of the device's width, so
 * the shop's responsive classes (sm:, md:, lg:) react to the simulated screen and not to the
 * dashboard window. The frame is scaled down to fit the column, like a screenshot of the device.
 * The app's stylesheets are mirrored into the frame (also after hot reloads in development).
 */
export function PreviewFrame({ device, scheme = "light", height = "75vh", children, testId }: { device: PreviewDevice; scheme?: "light" | "dark"; height?: string; children: ReactNode; testId?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const width = PREVIEW_WIDTHS[device];

  // Size of the column → scale factor.
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Frame document: same stylesheets and html classes (font variables) as the app.
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let observer: MutationObserver | null = null;
    const setup = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      doc.documentElement.className = [...document.documentElement.classList].filter((c) => c !== "dark" && c !== "light").join(" ");
      doc.documentElement.lang = document.documentElement.lang;
      doc.body.style.margin = "0";
      const sync = () => {
        doc.head.querySelectorAll("[data-mirrored]").forEach((n) => n.remove());
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
          // Styles rendered inside the preview itself live in the frame already.
          if (iframe.contains(n) || (n as HTMLElement).closest?.("[data-preview-frame]")) return;
          const copy = n.cloneNode(true) as HTMLElement;
          copy.setAttribute("data-mirrored", "");
          doc.head.appendChild(copy);
        });
      };
      sync();
      observer = new MutationObserver(sync);
      observer.observe(document.head, { childList: true, subtree: true, characterData: true });
      setBody(doc.body);
    };
    if (iframe.contentDocument?.readyState === "complete" && iframe.contentDocument.body) setup();
    iframe.addEventListener("load", setup);
    return () => {
      iframe.removeEventListener("load", setup);
      observer?.disconnect();
    };
  }, []);

  // Scrollbar like the real device: none on a phone (overlay scrollbars), thin in the shop's
  // light/dark scheme on desktop instead of the browser's default white bar.
  useEffect(() => {
    const root = body ? frame.current?.contentDocument?.documentElement : null;
    if (!root) return;
    root.style.setProperty("color-scheme", scheme);
    root.style.setProperty("scrollbar-width", device === "mobile" ? "none" : "thin");
    root.style.setProperty("scrollbar-color", scheme === "dark" ? "rgba(255,255,255,.25) transparent" : "rgba(0,0,0,.25) transparent");
  }, [body, device, scheme]);

  const scale = box.width ? Math.min(1, box.width / width) : 1;
  return (
    <div ref={outer} className="relative w-full overflow-hidden" style={{ height }} data-preview-frame="" data-testid={testId} data-device={device}>
      <iframe
        ref={frame}
        title="Preview"
        srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
        className="absolute left-0 top-0 origin-top-left border-0 bg-transparent"
        style={{ width, height: box.height ? box.height / scale : "100%", transform: `scale(${scale})`, left: box.width > width ? (box.width - width) / 2 : 0 }}
      />
      {body ? createPortal(children, body) : null}
    </div>
  );
}
