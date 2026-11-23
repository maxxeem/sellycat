"use client";

import { ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { FONT_FORMATS, fontExt } from "@/lib/design/font-file";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

export const MEDIA_BUCKET = "shop-media";

/** Uploads a file into the shop's own folder of the public media bucket and returns its URL. */
export async function uploadMedia(tenantId: string, folder: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${tenantId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  // For File bodies the storage client sends the file's own type (contentType is ignored), and
  // browsers often report none for fonts: give the file the right type, or the bucket rejects it.
  const type = (fontExt(file.name) ? FONT_FORMATS[fontExt(file.name)!].mime : "") || file.type;
  const body = type && type !== file.type ? new File([file], file.name, { type }) : file;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, body, { cacheControl: "31536000", upsert: false, contentType: type || undefined });
  if (error) throw error;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Files of a drop that match `accept` (MIME list like "image/png,image/jpeg"). */
export function acceptedFiles(files: FileList | File[], accept: string): File[] {
  const types = accept.split(",").map((s) => s.trim()).filter(Boolean);
  return Array.from(files).filter((f) => !types.length || types.some((t) => (t.endsWith("/*") ? f.type.startsWith(t.slice(0, -1)) : f.type === t)));
}

/** Drag-and-drop state and handlers for any element; `onFiles` gets the dropped files. */
export function useFileDrop(onFiles: (files: File[]) => void, disabled = false) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  return {
    over,
    handlers: {
      onDragEnter: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      },
      onDragOver: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      },
      onDrop: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      },
    },
  };
}

/**
 * One image setting (logo, favicon, hero …) as a tile: label and hint on top, a preview area of
 * fixed height that accepts a dropped file or a click, and replace/remove below once set. The URL
 * goes to the form through a hidden input (`name`) and/or `onChange`.
 */
export function ImageUpload({
  tenantId,
  folder,
  name,
  value,
  onChange,
  label,
  hint,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
  tone = "auto",
  height = "h-36",
  cover = false,
}: {
  tenantId: string;
  folder: string;
  name?: string;
  value: string;
  onChange?: (url: string) => void;
  label: string;
  hint?: string;
  accept?: string;
  /** Preview background: white / dark for logos made for such backgrounds, else the app's surface. */
  tone?: "auto" | "light" | "dark";
  /** Height of the preview area (Tailwind class), the same for all tiles of a card. */
  height?: string;
  /** Fill the area (photos) instead of fitting the whole image (logos). */
  cover?: boolean;
}) {
  const { t } = useI18n();
  const g = t.design;
  const [url, setUrl] = useState(value);
  const [seen, setSeen] = useState(value);
  // Follow outside changes (e.g. the branding import sets a logo).
  if (seen !== value) {
    setSeen(value);
    setUrl(value);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const set = (v: string) => {
    setUrl(v);
    onChange?.(v);
  };
  const upload = async (files: File[]) => {
    const file = acceptedFiles(files, accept)[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      set(await uploadMedia(tenantId, folder, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };
  const drop = useFileDrop(upload, busy);
  const toneClass = { auto: "bg-surface text-muted hover:text-ink", light: "bg-white text-neutral-500 hover:text-neutral-800", dark: "bg-[#111] text-white/60 hover:text-white" }[tone];

  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm">
      {/* Fixed-height heading (one-line title, two-line hint) so tiles of a grid line up. */}
      <div className="min-h-[3.25rem]">
        <p className="truncate font-semibold" title={label}>
          {label}
        </p>
        {hint ? <p className="line-clamp-2 text-xs text-muted">{hint}</p> : null}
      </div>
      {name ? <input type="hidden" name={name} value={url} /> : null}
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={`${label}: ${url ? g.replace : g.dropImage}`}
        {...drop.handlers}
        className={`relative flex ${height} w-full items-center justify-center overflow-hidden rounded-input border transition ${
          drop.over ? "border-2 border-accent ring-4 ring-accent/15" : url ? "border-line" : "border-dashed border-line hover:border-muted"
        } ${toneClass}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={cover ? "h-full w-full object-cover" : "h-full w-full object-contain p-4"} />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-xs">
            <ImagePlus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            {g.dropImage}
          </span>
        )}
        {busy || drop.over ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-2/85 text-xs font-semibold text-ink">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <UploadCloud className="h-6 w-6 text-accent-text" aria-hidden />}
            {busy ? g.uploading : g.dropRelease}
          </span>
        ) : null}
      </button>
      {/* The action row keeps its height when empty, so the next row of tiles stays aligned. */}
      <div className={`flex h-7 gap-1 ${url ? "" : "invisible"}`} aria-hidden={!url}>
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-ink">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> {g.replace}
          </button>
          <button type="button" onClick={() => set("")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-xs font-semibold text-muted hover:bg-danger/10 hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> {g.remove}
          </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          await upload(files);
        }}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
