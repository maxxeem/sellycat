"use client";

import { UploadCloud } from "lucide-react";
import { useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";

type Props = {
  label: string;
  hint?: string;
  name: string;
  accept: string;
  disabled?: boolean;
  onChange: (input: HTMLInputElement) => void;
  /** Rendered below the label once a file was picked (e.g. name · duration). */
  summary?: ReactNode;
};

/** Drag & drop area wrapping a real file input (label text first, so getByLabel keeps working). */
export function Dropzone({ label, hint, name, accept, disabled, onChange, summary }: Props) {
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const input = e.currentTarget.querySelector("input[type=file]") as HTMLInputElement | null;
    if (!input || !e.dataTransfer.files.length) return;
    input.files = e.dataTransfer.files;
    onChange(input);
  };
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-4 py-6 text-center text-sm transition ${
        over ? "border-accent bg-accent/5" : "border-line bg-surface-2 hover:border-muted"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      data-testid={`dropzone-${name}`}
    >
      <span className="font-medium">{label}</span>
      <UploadCloud className="h-7 w-7 text-muted" />
      <span className="text-xs text-muted">{hint}</span>
      <input type="file" name={name} accept={accept} disabled={disabled} className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget)} />
      {summary ? <span className="mt-1 rounded-md bg-line/60 px-2 py-1 text-xs">{summary}</span> : null}
    </label>
  );
}
