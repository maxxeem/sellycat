import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/lib/i18n/locales";
import { inter } from "../../fonts";
import "../../globals.css";

/**
 * Root layout of the public shops (every shop host). The proxy puts the shop's language and
 * tenant id into the internal path. Phase 2 replaces the Sellycat look with the shop's theme.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function ShopRootLayout({ children, params }: LayoutProps<"/shop/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh bg-surface-2">{children}</body>
    </html>
  );
}
