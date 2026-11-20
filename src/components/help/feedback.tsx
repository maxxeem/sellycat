"use client";

import { useState } from "react";

type Texts = { question: string; yes: string; no: string; prompt: string; send: string; thanks: string };

/** «War das hilfreich?»: one vote per article and browser; «Nein» asks what was missing. */
export function HelpFeedback({ articleId, locale, texts }: { articleId: string; locale: string; texts: Texts }) {
  const [state, setState] = useState<"idle" | "no" | "done">("idle");
  const [comment, setComment] = useState("");
  const send = async (helpful: boolean, text?: string) => {
    setState("done");
    await fetch("/api/help/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ articleId, helpful, comment: text, locale }) }).catch(() => undefined);
  };
  if (state === "done") return <p className="text-sm text-muted" role="status">{texts.thanks}</p>;
  const pill = "rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium hover:border-accent";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{texts.question}</span>
        <button type="button" className={pill} onClick={() => void send(true)}>{texts.yes}</button>
        <button type="button" className={pill} onClick={() => setState("no")}>{texts.no}</button>
      </div>
      {state === "no" ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void send(false, comment);
          }}
        >
          <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder={texts.prompt} aria-label={texts.prompt} className="h-10 flex-1 rounded-full border border-line bg-surface px-4 text-sm outline-none focus:border-accent" />
          <button type="submit" className="h-10 rounded-full bg-coral px-5 text-sm font-semibold text-ink">{texts.send}</button>
        </form>
      ) : null}
    </div>
  );
}
