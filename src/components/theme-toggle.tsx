"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/context";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t.common.theme}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-input border border-line p-1.5 text-muted hover:text-ink"
    >
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
    </button>
  );
}
