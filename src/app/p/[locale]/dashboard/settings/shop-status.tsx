"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SHOP_CSS, themeAttrs, themeStyle } from "@/components/shop/shop-styles";
import { ShopGate } from "@/components/shop/shop-gate";
import { Field, Input, Notice, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { NOTICE_MAX, noticeTexts, type NoticeKey, type ShopNotice, type ShopState } from "@/lib/shop/shop-state";
import type { ShopTheme } from "@/lib/shop/theme";
import { saveShopNotice } from "../shop-state-actions";
import { ShopStateSwitch } from "../shop-state-switch";

type Defaults = { building: { title: string; text: string }; closed: { title: string; text: string } };

/** Online/offline switch and the texts of both notes, each with a live preview. */
export function ShopStatus({ state, notice, defaults, name, theme }: { state: ShopState; notice: ShopNotice; defaults: Defaults; name: string; theme: ShopTheme }) {
  const { t } = useI18n();
  const s = t.dashboard.shopState;
  const [values, setValues] = useState<Record<NoticeKey, string>>({ closed_title: notice.closed_title ?? "", closed_text: notice.closed_text ?? "" });
  const [result, action, pending] = useActionState(saveShopNotice, null);
  const texts = noticeTexts(values, defaults);
  const status = state === "online" ? s.statusOnline : state === "closed" ? s.statusClosed : s.statusBuilding;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-line p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${state === "online" ? "bg-success" : state === "closed" ? "bg-danger" : "bg-warn"}`} />
            {status}
          </p>
          <p className="mt-0.5 text-sm text-muted">{state === "online" ? s.onlineHint : state === "closed" ? s.closedHint : s.buildingHint}</p>
        </div>
        {state === "building" ? (
          // The first publish lives in the getting-started steps on the overview.
          <Link href="/dashboard#setup" className={buttonClass.secondary}>
            {s.publishStep}
          </Link>
        ) : (
          <ShopStateSwitch state={state} />
        )}
      </div>

      {/* The «closed» note and its preview only while the shop is offline (they take a lot of room). */}
      {state === "closed" ? (
      <form action={action} className="grid gap-6 xl:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="font-semibold">{s.closedTitle}</p>
            <p className="text-xs text-muted">{s.closedWhen}</p>
          </div>
          <Field label={s.fieldTitle}>
            <Input name="closed_title" value={values.closed_title} onChange={(e) => setValues({ ...values, closed_title: e.target.value })} placeholder={defaults.closed.title} maxLength={NOTICE_MAX.closed_title} />
          </Field>
          <Field label={s.fieldText}>
            <textarea name="closed_text" value={values.closed_text} onChange={(e) => setValues({ ...values, closed_text: e.target.value })} placeholder={defaults.closed.text} rows={2} maxLength={NOTICE_MAX.closed_text} className={inputClass} />
          </Field>
          <p className="text-xs text-muted">{s.textsHint}</p>
          {result?.error ? <Notice tone="error">{t.common.error}</Notice> : result?.ok ? <Notice tone="success">{t.common.saved}</Notice> : null}
          <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`}>
            {pending ? t.common.loading : t.common.save}
          </button>
        </section>
        <div className="min-w-0 self-start overflow-hidden rounded-input border border-line" aria-label={s.preview}>
          <style>{SHOP_CSS}</style>
          <div className="shop-root pointer-events-none" style={themeStyle(theme)} {...themeAttrs(theme)} inert>
            <ShopGate state="closed" name={name} theme={theme} title={texts.closed.title} text={texts.closed.text} preview />
          </div>
        </div>
      </form>
      ) : null}
    </div>
  );
}
