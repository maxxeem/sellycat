import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Providers } from "@/components/providers";
import { getDictionary } from "@/lib/i18n";
import { publicDictionary } from "@/lib/i18n/public-dictionary";
import { LOCALES, isLocale } from "@/lib/i18n/locales";
import { inter } from "../../fonts";
import "../../globals.css";

/** Root layout of Sellycat's own pages (apex). The proxy puts the visitor's language in the path. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: { default: "Sellycat", template: "%s · Sellycat" },
  description: "Sellycat – der eigene Deal-Shop mit Gutscheinen im Wallet.",
  // Public pages (start, pricing, help) are indexed in production only; staging and previews never.
  robots: process.env.VERCEL_ENV === "production" ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FF4B23",
};

export default async function PlatformLayout({ children, params }: LayoutProps<"/p/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers locale={locale} dictionary={publicDictionary(getDictionary(locale))}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
