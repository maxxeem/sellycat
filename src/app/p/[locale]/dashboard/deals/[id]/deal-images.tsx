"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useRef } from "react";
import { useFileDrop } from "@/components/image-upload";
import { useI18n } from "@/lib/i18n/context";

export const IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const MAX = 12;

/**
 * Deal pictures: the whole area takes dropped files. Empty, it is one large drop field; with
 * pictures, a grid with the cover marked, and a tile to add more.
 */
export function DealImages({
  images,
  uploading,
  label,
  hint,
  onAdd,
  onMove,
  onRemove,
}: {
  images: Array<{ url: string; alt: string }>;
  uploading: boolean;
  label: string;
  hint: string;
  onAdd: (files: File[]) => void;
  onMove: (index: number, by: number) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();
  const g = t.design;
  const input = useRef<HTMLInputElement>(null);
  const full = images.length >= MAX;
  const drop = useFileDrop(onAdd, uploading || full);
  const pick = () => input.current?.click();
  const iconBtn = "flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-30";

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted">
          {images.length} / {MAX}
        </p>
      </div>
      <div {...drop.handlers} className={`relative rounded-card transition ${drop.over ? "ring-2 ring-accent ring-offset-4 ring-offset-surface-2" : ""}`} data-testid="deal-images">
        {images.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img, i) => (
              <div key={img.url} className="group relative aspect-[4/3] overflow-hidden rounded-input border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                {i === 0 ? <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{g.coverImage}</span> : null}
                <button type="button" onClick={() => onRemove(i)} aria-label={g.remove} className={`${iconBtn} absolute right-2 top-2`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {images.length > 1 ? (
                  <div className="absolute inset-x-2 bottom-2 flex justify-between">
                    <button type="button" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label="←" className={iconBtn}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onMove(i, 1)} disabled={i === images.length - 1} aria-label="→" className={iconBtn}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {!full ? (
              <button type="button" onClick={pick} disabled={uploading} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-input border border-dashed border-line px-3 text-center text-xs text-muted transition hover:border-muted hover:text-ink">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <ImagePlus className="h-6 w-6" strokeWidth={1.5} aria-hidden />}
                {uploading ? g.uploading : g.dropImages}
              </button>
            ) : null}
          </div>
        ) : (
          <button type="button" onClick={pick} disabled={uploading} className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-input border border-dashed border-line bg-surface px-4 text-center text-muted transition hover:border-muted hover:text-ink">
            {uploading ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden /> : <UploadCloud className="h-7 w-7" strokeWidth={1.5} aria-hidden />}
            <span className="text-sm font-medium">{uploading ? g.uploading : g.dropImages}</span>
            <span className="text-xs">{hint}</span>
          </button>
        )}
        {drop.over ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-card bg-surface-2/85 text-sm font-semibold">
            <UploadCloud className="h-7 w-7 text-accent-text" aria-hidden />
            {g.dropRelease}
          </div>
        ) : null}
      </div>
      {images.length ? <p className="text-xs text-muted">{hint}</p> : null}
      <input
        ref={input}
        type="file"
        accept={`${IMAGE_TYPES},image/avif,.avif`}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          onAdd(files);
        }}
      />
    </div>
  );
}
