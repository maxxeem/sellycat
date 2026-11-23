"use client";

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
  const [values, setValues] = useState<Record<NoticeKey, string>>({
    building_title: notice.building_title ?? "",
    building_text: notice.building_text ?? "",
    closed_title: notice.closed_title ?? "",
    closed_text: notice.closed_text ?? "",
  });
  const [result, action, pending] = useActionState(saveShopNotice, null);
  const texts = noticeTexts(values, defaults);
  const field = (key: NoticeKey, label: string, long = false) => (
    <Field label={label}>
      {long ? (
        <textarea name={key} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} placeholder={key.startsWith("building") ? defaults.building.text : defaults.closed.text} rows={2} maxLength={NOTICE_MAX[key]} className={inputClass} />
      ) : (
        <Input name={key} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} placeholder={key.startsWith("building") ? defaults.building.title : defaults.closed.title} maxLength={NOTICE_MAX[key]} />
      )}
    </Field>
  );
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
        <ShopStateSwitch state={state} />
      </div>

      <form action={action} className="flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {(["building", "closed"] as const).map((kind) => (
            <section key={kind} className="flex min-w-0 flex-col gap-3">
              <div>
                <p className="font-semibold">{kind === "building" ? s.buildingTitle : s.closedTitle}</p>
                <p className="text-xs text-muted">{kind === "building" ? s.buildingWhen : s.closedWhen}</p>
              </div>
              {field(`${kind}_title`, s.fieldTitle)}
              {field(`${kind}_text`, s.fieldText, true)}
              <div className="overflow-hidden rounded-input border border-line" aria-label={s.preview}>
                <style>{SHOP_CSS}</style>
                <div className="shop-root pointer-events-none" style={themeStyle(theme)} {...themeAttrs(theme)} inert>
                  <ShopGate state={kind} name={name} theme={theme} title={texts[kind].title} text={texts[kind].text} preview />
                </div>
              </div>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted">{s.textsHint}</p>
        {result?.error ? <Notice tone="error">{t.common.error}</Notice> : result?.ok ? <Notice tone="success">{t.common.saved}</Notice> : null}
        <button type="submit" disabled={pending} className={`${buttonClass.primary} self-start`}>
          {pending ? t.common.loading : t.common.save}
        </button>
      </form>
    </div>
  );
}
