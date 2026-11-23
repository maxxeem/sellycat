import type { ShopProfile } from "@/lib/shop/queries";
import { noticeTexts } from "@/lib/shop/shop-state";
import { ShopGate } from "./shop-gate";
import { shopTexts } from "./shop-texts";

/** The building/closed note of a shop that is not online, with its own or the default texts. */
export function ShopGateFor({ shop }: { shop: ShopProfile }) {
  const texts = noticeTexts(shop.notice, shopTexts(shop.locale).gate);
  const state = shop.state === "closed" ? "closed" : "building";
  return (
    <>
      <meta name="robots" content="noindex" />
      <ShopGate state={state} name={shop.name} theme={shop.theme} title={texts[state].title} text={texts[state].text} />
    </>
  );
}
