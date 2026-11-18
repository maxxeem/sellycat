"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { markRequestDone } from "./actions";

export function DoneButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={buttonClass.ghost} disabled={pending} onClick={() => start(() => markRequestDone(id))}>
      {pending ? "…" : label}
    </button>
  );
}
