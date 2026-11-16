"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-h1 text-coral">404</p>
      <h1 className="text-xl font-bold">{t.common.notFoundTitle}</h1>
      <p className="text-muted">{t.common.notFoundText}</p>
      <Link href="/" className="font-semibold text-accent-text hover:underline">
        {t.common.toHome}
      </Link>
    </main>
  );
}
