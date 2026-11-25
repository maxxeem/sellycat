import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fromParams } from "@/lib/i18n/params";
import { loadWalletDesign, walletAvailable, walletShop } from "@/lib/wallet/passes";
import { sampleVoucher } from "@/lib/wallet/sample";
import { DesignTabs } from "../design-tabs";
import { WalletDesignEditor } from "./wallet-design-editor";

export const metadata = { title: "Wallet" };

export default async function WalletDesignPage({ params }: PageProps<"/p/[locale]/dashboard/design/wallet">) {
  const { t } = await fromParams(params);
  return (
    <div className="flex flex-col gap-4">
      <DesignTabs active="wallet" t={t.voucherDesign} walletLabel={t.wallet.tabWallet} />
      <Suspense fallback={<Skeleton className="h-[80vh]" />}>
        <Editor />
      </Suspense>
    </div>
  );
}

async function Editor() {
  const { tenant } = await requireTenant("editor");
  const [design, sample] = await Promise.all([loadWalletDesign(tenant.id), sampleVoucher(tenant.id)]);
  if (!sample) return null;
  const shop = walletShop(sample.shop, sample.host, design);
  return (
    <WalletDesignEditor
      initial={design}
      shop={{ id: shop.id, name: shop.name, locale: shop.locale, host: shop.host, primary: shop.primary, logo: shop.logo }}
      logos={{ light: sample.shop.theme.logoLight || null, dark: sample.shop.theme.logoDark || null, favicon: sample.shop.theme.favicon || null }}
      voucher={sample.voucher}
      available={walletAvailable()}
    />
  );
}
