"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const MEDIA_BUCKET = "shop-media";

/** Uploads a file into the shop's own folder of the public media bucket and returns its URL. */
export async function uploadMedia(tenantId: string, folder: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${tenantId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * One image field (logo, favicon, hero …): shows the current image, uploads a new one and hands
 * the URL to the form through a hidden input (`name`) and/or `onChange`.
 */
export function ImageUpload({
  tenantId,
  folder,
  name,
  value,
  onChange,
  label,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
  removeLabel = "Remove",
  aspect = "aspect-[3/1]",
}: {
  tenantId: string;
  folder: string;
  name?: string;
  value: string;
  onChange?: (url: string) => void;
  label: string;
  accept?: string;
  removeLabel?: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const set = (v: string) => {
    setUrl(v);
    onChange?.(v);
  };
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      {name ? <input type="hidden" name={name} value={url} /> : null}
      <div className={`relative flex ${aspect} w-full items-center justify-center overflow-hidden rounded-input border border-dashed border-line bg-surface`}>
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="max-h-full max-w-full object-contain p-2" />
            <button type="button" onClick={() => set("")} aria-label={removeLabel} className="absolute right-2 top-2 rounded-full bg-ink/70 p-1 text-white">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted hover:text-ink" aria-label={label}>
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            set(await uploadMedia(tenantId, folder, file));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
