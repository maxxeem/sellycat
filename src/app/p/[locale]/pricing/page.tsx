import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Skeleton, buttonClass } from "@/components/ui";
import { isCurrency } from "@/lib/billing/currency";
import { currencyFromRequest } from "@/lib/billing/currency-server";
import { toPlan } from "@/lib/billing/plans";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/locales";
import { createPublicClient } from "@/lib/supabase/admin";
import { PricingTable } from "./pricing-table";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Sellycat – Preise / Pricing" };

/** Public pricing page: plans from the database (staff edits them), currency by location. */
export default async function PricingPage({ params, searchParams }: PageProps<"/p/[locale]/pricing">) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const t = getDictionary(locale);
  return (
    <main className="flex min-h-dvh flex-col bg-surface-2">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Sellycat">
          <Logo width={150} />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className={buttonClass.secondary}>
            {t.common.login}
          </Link>
        </div>
      </header>
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-8">
        <h1 className="text-h2 text-balance text-center">{t.pricing.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t.pricing.intro}</p>
        <Suspense fallback={<Skeleton className="mt-10 h-[32rem]" />}>
          <Plans locale={locale} searchParams={searchParams} />
        </Suspense>
      </section>
      <SiteFooter />
      <div className="h-2 bg-coral" aria-hidden />
    </main>
  );
}

async function Plans({ locale, searchParams }: { locale: "de" | "en"; searchParams: PageProps<"/p/[locale]/pricing">["searchParams"] }) {
  const [{ data }, located, sp] = await Promise.all([
    createPublicClient().from("plans").select("id, name, sort_order, is_public, contact_only, limits, prices, marketing, application_fee_bps, application_fee_fixed, trial_days").eq("is_public", true).order("sort_order"),
    currencyFromRequest(),
    searchParams,
  ]);
  const chosen = typeof sp.currency === "string" ? sp.currency.toUpperCase() : null;
  const plans = (data ?? []).map(toPlan);
  return <PricingTable plans={plans} locale={locale} initialCurrency={isCurrency(chosen) ? chosen : located} />;
}
