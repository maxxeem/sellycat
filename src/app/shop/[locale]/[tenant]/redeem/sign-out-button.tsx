"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "./actions";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOut();
          router.refresh();
        })
      }
      className="shrink-0 text-sm font-semibold underline underline-offset-2"
    >
      {label}
    </button>
  );
}
