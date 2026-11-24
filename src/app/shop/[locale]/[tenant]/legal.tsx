import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { shopTexts } from "@/components/shop/shop-texts";
import { pageMetadata } from "@/lib/shop/seo-server";
import { getLegalPage, getShopProfile } from "@/lib/shop/queries";

const PATH = { imprint: "/impressum", terms: "/agb", privacy: "/datenschutz" } as const;

export async function legalMetadata(tenantId: string, kind: keyof typeof PATH): Promise<Metadata> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("hours");
  const shop = await getShopProfile(tenantId);
  if (!shop) return {};
  const title = `${shopTexts(shop.locale)[kind]} · ${shop.name}`;
  return pageMetadata(shop, PATH[kind], { title, description: title });
}

/** Imprint, terms or privacy policy of a shop: formatted document, or plain text (blank line = new paragraph). */
export async function LegalPage({ tenantId, kind }: { tenantId: string; kind: "imprint" | "terms" | "privacy" }) {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("hours");
  const [shop, content] = await Promise.all([getShopProfile(tenantId), getLegalPage(tenantId, kind)]);
  if (!shop || !content?.text.trim()) notFound();
  const t = shopTexts(shop.locale);
  const title = kind === "imprint" ? t.imprint : kind === "terms" ? t.terms : t.privacy;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="shop-heading mb-6 text-3xl font-bold">{title}</h1>
      {content.html ? (
        // Generated from the stored document with the known nodes and marks only (rich-text-server).
        <div className="shop-prose" dangerouslySetInnerHTML={{ __html: content.html }} />
      ) : (
        <div className="shop-prose">
          {content.text.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p.trim()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
