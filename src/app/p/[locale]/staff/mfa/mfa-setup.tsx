"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input, Notice, buttonClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

type Phase = { kind: "loading" } | { kind: "enrol"; factorId: string; qr: string; secret: string } | { kind: "verify"; factorId: string };

/** Supabase MFA (TOTP), taken over from SwypeCast: enrol once, then verify a code per session. */
export function MfaSetup() {
  const { t } = useI18n();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) return setError(listError.message);
      const existing = data.totp.find((f) => f.status === "verified");
      if (existing) {
        if (!cancelled) setPhase({ kind: "verify", factorId: existing.id });
        return;
      }
      for (const f of data.all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrol, error: enrolError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Sellycat Staff" });
      if (enrolError) return setError(enrolError.message);
      if (!cancelled) setPhase({ kind: "enrol", factorId: enrol.id, qr: enrol.totp.qr_code, secret: enrol.totp.secret });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const verify = async () => {
    if (phase.kind === "loading") return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: phase.factorId, code: code.trim() });
    setBusy(false);
    if (verifyError) return setError(t.staff.mfaInvalid);
    router.push("/admin");
    router.refresh();
  };

  if (phase.kind === "loading") return error ? <Notice tone="error">{error}</Notice> : <p className="text-sm text-muted">{t.common.loading}</p>;

  return (
    <div className="flex flex-col gap-4">
      {phase.kind === "enrol" ? (
        <>
          <p className="text-sm">{t.staff.mfaEnrol}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={phase.qr} alt="QR" className="h-44 w-44 rounded-input bg-white p-2" />
          <p className="text-xs text-muted">
            <code className="select-all">{phase.secret}</code>
          </p>
        </>
      ) : (
        <p className="text-sm">{t.staff.mfaVerify}</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" aria-label="Code" className="max-w-[10rem] text-center text-lg tracking-widest" />
        <button type="submit" disabled={busy || code.trim().length !== 6} className={buttonClass.primary}>
          {t.staff.mfaConfirm}
        </button>
      </form>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
