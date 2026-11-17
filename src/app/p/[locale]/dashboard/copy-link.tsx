"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui";

/** Copies the shop address; shows a tick for a moment. */
export function CopyLink({ url, label, done }: { url: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass.secondary}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt(label, url);
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      {copied ? done : label}
    </button>
  );
}
