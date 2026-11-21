import type { Metadata } from "next";
import { Suspense } from "react";
import "@/components/site/site.css";
import { AppShowcase } from "@/components/site/app-showcase";
import { Audiences } from "@/components/site/audiences";
import { Bands } from "@/components/site/bands";
import { FeatureSlider } from "@/components/site/feature-slider";
import { Pricing } from "@/components/site/pricing";
import { ScrollGlow } from "@/components/site/scroll-glow";
import { SiteFooter } from "@/components/site-footer";
import { FinalCta, Hero, SiteHeader, ctaLabel } from "@/components/site/sections";
import { StatementBand } from "@/components/site/statement-band";
import { StepsShowcase } from "@/components/site/steps-showcase";
import { StoryTour } from "@/components/site/story-tour";
import { signupCta, type SignupCta } from "@/lib/access/rules";
import { turnstileSiteKey } from "@/lib/access/server";
import { currencyFromRequest } from "@/lib/billing/currency-server";
import { toPlan } from "@/lib/billing/plans";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { getSignupMode } from "@/lib/platform/settings";
import { apexUrl } from "@/lib/site/hosts";
import { createPublicClient } from "@/lib/supabase/admin";

const localeOf = (raw: string): Locale => (isLocale(raw) ? raw : "en");

/** One URL for both languages (the proxy picks the language from the cookie or the browser). */
export async function generateMetadata({ params }: PageProps<"/p/[locale]">): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  const m = getDictionary(locale).site.meta;
  const site = apexUrl();
  return {
    metadataBase: new URL(site),
    title: { absolute: m.title },
    description: m.description,
    alternates: { canonical: "/" },
    openGraph: { title: m.ogTitle, description: m.description, url: "/", type: "website", siteName: "Sellycat", locale: locale === "de" ? "de_CH" : "en_US", alternateLocale: locale === "de" ? ["en_US"] : ["de_CH"], images: [{ url: "/og", width: 1200, height: 630, alt: m.ogClaim }] },
    twitter: { card: "summary_large_image", title: m.ogTitle, description: m.description, images: ["/og"] },
  };
}

/** Who runs it (Organization), the site (WebSite) and the product with its plans as offers (SoftwareApplication). */
function structuredData(locale: Locale, description: string, offers: { name: string; price: number; currency: string }[]) {
  const site = apexUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: "Sellycat",
        url: site,
        logo: `${site}/brand/sellycat-icon-coral-256.png`,
        parentOrganization: { "@type": "Organization", name: "my105 GmbH", address: { "@type": "PostalAddress", streetAddress: "Vulkanplatz 7", postalCode: "8048", addressLocality: "Zürich", addressCountry: "CH" } },
      },
      { "@type": "WebSite", "@id": `${site}/#website`, url: site, name: "Sellycat", inLanguage: ["de", "en"], publisher: { "@id": `${site}/#organization` } },
      {
        "@type": "SoftwareApplication",
        name: "Sellycat",
        url: site,
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        publisher: { "@id": `${site}/#organization` },
        offers: offers.map((o) => ({ "@type": "Offer", name: o.name, price: String(o.price), priceCurrency: o.currency })),
      },
    ],
  };
}

async function loadPlans() {
  const { data } = await createPublicClient()
    .from("plans")
    .select("id, name, sort_order, is_public, contact_only, limits, prices, marketing, application_fee_bps, application_fee_fixed, trial_days")
    .eq("is_public", true)
    .order("sort_order");
  return (data ?? []).map(toPlan);
}

/**
 * Landing page of sellycat.com (structure and motion as the reference landing): hero, bands with the
 * purchase demo, product tour, statement, steps, features, scanning, audiences, pricing, closing CTA.
 * Every call to action follows the signup mode (waitlist / code / start).
 */
export default async function HomePage({ params }: PageProps<"/p/[locale]">) {
  const locale = localeOf((await params).locale);
  const t = getDictionary(locale);
  const cta = signupCta(await getSignupMode());
  return (
    <main className="site relative min-h-dvh overflow-x-clip" data-testid="landing">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden>
        <span className="drift-a absolute -left-[20%] top-[10%] h-[55vmax] w-[55vmax] rounded-full bg-[rgb(var(--glow-rgb))] opacity-[0.45] blur-[120px]" />
        <span className="drift-b absolute -right-[15%] -top-[20%] h-[45vmax] w-[45vmax] rounded-full bg-coral opacity-[0.08] blur-[120px]" />
      </div>
      <div className="relative isolate">
        <SiteHeader t={t} cta={cta} />
        <Hero t={t} cta={cta} />
        <section className="relative isolate overflow-x-clip pb-[var(--site-gap)]" data-testid="benefits">
          <h2 className="sr-only">{t.site.bands.title}</h2>
          <Bands labels={t.site.bands} locale={locale} />
          <StoryTour labels={t.site.tour} locale={locale} />
        </section>
        <StatementBand before={t.site.statement.before} brand={t.site.statement.brand} after={t.site.statement.after} locale={locale} buy={t.site.bands.ui.buy} />
        <ScrollGlow>
          <div className="site-section mx-auto max-w-6xl px-5 sm:px-8">
            <div className="site-head">
              <h2>{t.site.steps.title}</h2>
              <p>{t.site.steps.subtitle}</p>
            </div>
            <StepsShowcase labels={t.site.steps} />
          </div>
        </ScrollGlow>
        <FeatureSlider labels={t.site.features} />
        <AppShowcase labels={t.site.scan} locale={locale} />
        <Audiences labels={t.site.audiences} />
        <Suspense fallback={<div className="site-section min-h-[60rem]" id="preise" />}>
          <PricingSection t={t} locale={locale} cta={cta} />
        </Suspense>
        <FinalCta t={t} cta={cta} turnstileKey={turnstileSiteKey()} />
        <SiteFooter />
      </div>
      <div className="h-2 bg-coral" aria-hidden />
    </main>
  );
}

/** Plans live from the plan table, prices in the visitor's currency (request data, hence streamed). */
async function PricingSection({ t, locale, cta }: { t: Dictionary; locale: Locale; cta: SignupCta }) {
  const [plans, currency] = await Promise.all([loadPlans(), currencyFromRequest()]);
  const offers = plans.filter((p) => !p.contactOnly).map((p) => ({ name: p.name, price: p.prices.monthly[currency] ?? 0, currency }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(locale, t.site.meta.description, offers)).replace(/</g, "\\u003c") }} />
      <Pricing plans={plans} labels={t.site.pricing} locale={locale} currency={currency} cta={cta} ctaLabel={ctaLabel(t, cta)} />
    </>
  );
}
