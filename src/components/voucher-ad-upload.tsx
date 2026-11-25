"use client";

import { useEffect, useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { Notice } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/context";
import { AD_FORMAT, adIssues, type VoucherSize } from "@/lib/vouchers/design";

/** Upload of an advertising visual for the voucher PDF, with the exact format and a warning when it does not suit. */
export function VoucherAdUpload({ tenantId, size, value, onChange }: { tenantId: string; size: VoucherSize; value: string | null; onChange: (url: string | null) => void }) {
  const { t } = useI18n();
  const g = t.voucherDesign;
  const f = AD_FORMAT[size];
  const [natural, setNatural] = useState<{ url: string; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!value) return;
    const img = new window.Image();
    img.onload = () => setNatural({ url: value, width: img.naturalWidth, height: img.naturalHeight });
    img.src = value;
    return () => {
      img.onload = null;
    };
  }, [value]);
  const px = natural && natural.url === value ? natural : null;
  const issues = px ? adIssues(px.width, px.height, size) : null;
  return (
    <>
      <ImageUpload tenantId={tenantId} folder="vouchers" value={value ?? ""} label={g.adImage} hint={fmt(g.adImageHint, { width: f.width, height: f.height })} height="aspect-[1.414]" cover accept="image/jpeg,image/png,image/webp" onChange={(url) => onChange(url || null)} />
      {issues?.small ? <Notice tone="warning">{fmt(g.adSmall, { width: px!.width, height: px!.height, min: `${f.width / 2} × ${Math.ceil(f.height / 2)}` })}</Notice> : null}
      {issues?.cropped ? <Notice tone="warning">{g.adCropped}</Notice> : null}
      <div className="rounded-input bg-surface p-3 text-xs" data-testid="ad-format">
        <p className="mb-1.5 font-semibold">{g.adFormatTitle}</p>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-muted">
          {g.adFormat.map((line) => (
            <li key={line}>{fmt(line, { paper: size.toUpperCase(), mm: f.mm, width: f.width, height: f.height })}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
